/**
 * GitHubExtractor
 *
 * Handles repo pages, issues, PRs, and single files via the GitHub REST API.
 * No auth required for public repos; set GITHUB_TOKEN for higher rate limits.
 *
 * Optional env: GITHUB_TOKEN
 */

import { ContentType, ExtractedContent, GitHubMetadata } from "@/types";
import { BaseExtractor } from "./base";
import { httpClient } from "./http-client";

type GHType = "repo" | "issue" | "pr" | "file" | "gist";

interface ParsedGHUrl {
  owner: string;
  repo:  string;
  type:  GHType;
  extra: string; // issue number, PR number, file path, etc.
}

function parseGitHubUrl(url: string): ParsedGHUrl | null {
  const u = new URL(url);
  const parts = u.pathname.replace(/^\//, "").split("/");

  if (u.hostname === "gist.github.com") {
    return { owner: parts[0] ?? "", repo: parts[1] ?? "", type: "gist", extra: "" };
  }

  const [owner, repo, section, ...rest] = parts;
  if (!owner || !repo) return null;

  if (section === "issues")      return { owner, repo, type: "issue", extra: rest[0] ?? "" };
  if (section === "pull")        return { owner, repo, type: "pr",    extra: rest[0] ?? "" };
  if (section === "blob")        return { owner, repo, type: "file",  extra: rest.join("/") };
  return { owner, repo, type: "repo", extra: "" };
}

export class GitHubExtractor extends BaseExtractor {
  readonly supportedTypes = [ContentType.GITHUB];

  private get headers() {
    const token = process.env.GITHUB_TOKEN;
    return token
      ? { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
      : { Accept: "application/vnd.github+json" };
  }

  async extract(url: string): Promise<ExtractedContent> {
    const parsed = parseGitHubUrl(url);
    if (!parsed) throw new Error(`Cannot parse GitHub URL: ${url}`);

    switch (parsed.type) {
      case "issue": return this.extractIssue(url, parsed);
      case "pr":    return this.extractIssue(url, parsed); // PRs use same issues API
      case "file":  return this.extractFile(url, parsed);
      default:      return this.extractRepo(url, parsed);
    }
  }

  private async extractRepo(url: string, p: ParsedGHUrl): Promise<ExtractedContent> {
    const { data } = await httpClient.get(
      `https://api.github.com/repos/${p.owner}/${p.repo}`,
      { headers: this.headers }
    );

    const meta: GitHubMetadata = {
      owner:       p.owner,
      repo:        p.repo,
      type:        "repo",
      title:       data.full_name,
      description: data.description ?? "",
      stars:       data.stargazers_count,
      language:    data.language ?? undefined,
    };

    const rawText = this.cleanText(
      `${meta.title}\n${meta.description ?? ""}`
    );

    return {
      url,
      contentType: ContentType.GITHUB,
      title:       meta.title,
      description: meta.description,
      author:      p.owner,
      rawText,
      metadata:    meta,
      isLarge:     false,
      extractedAt: this.now(),
    };
  }

  private async extractIssue(url: string, p: ParsedGHUrl): Promise<ExtractedContent> {
    const endpoint = `https://api.github.com/repos/${p.owner}/${p.repo}/issues/${p.extra}`;
    const { data } = await httpClient.get(endpoint, { headers: this.headers });

    const meta: GitHubMetadata = {
      owner:  p.owner,
      repo:   p.repo,
      type:   p.type as "issue" | "pr",
      title:  `[${p.owner}/${p.repo}] #${p.extra}: ${data.title}`,
      body:   data.body ?? "",
      labels: data.labels?.map((l: { name: string }) => l.name) ?? [],
    };

    const rawText = this.cleanText(`${meta.title}\n\n${meta.body ?? ""}`);

    return {
      url,
      contentType: ContentType.GITHUB,
      title:       meta.title,
      description: this.truncate(meta.body ?? "", 200),
      author:      data.user?.login,
      publishedAt: data.created_at ? new Date(data.created_at) : undefined,
      rawText,
      metadata:    meta,
      isLarge:     this.isLargeContent(rawText),
      extractedAt: this.now(),
    };
  }

  private async extractFile(url: string, p: ParsedGHUrl): Promise<ExtractedContent> {
    // p.extra = "refs/heads/main/path/to/file.ts" — strip branch ref
    const pathParts = p.extra.split("/");
    const filePath  = pathParts.slice(1).join("/"); // drop branch name

    const endpoint = `https://api.github.com/repos/${p.owner}/${p.repo}/contents/${filePath}`;
    const { data } = await httpClient.get(endpoint, { headers: this.headers });

    const content = data.encoding === "base64"
      ? Buffer.from(data.content, "base64").toString("utf-8")
      : data.content ?? "";

    const meta: GitHubMetadata = {
      owner: p.owner,
      repo:  p.repo,
      type:  "file",
      title: `${p.owner}/${p.repo}: ${filePath}`,
      body:  content,
    };

    const rawText = this.cleanText(content);

    return {
      url,
      contentType: ContentType.GITHUB,
      title:       meta.title,
      description: `File: ${filePath}`,
      rawText,
      metadata:    meta,
      isLarge:     this.isLargeContent(rawText),
      extractedAt: this.now(),
    };
  }
}
