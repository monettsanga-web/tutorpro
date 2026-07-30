#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const outDir = path.join(root, 'seo-output')
const publicDir = path.join(root, 'public')
const siteUrl = 'https://www.tutorpro.site'

const seedKeywords = [
  'online English classes for kids',
  'Novakid alternative',
  '51Talk alternative',
  'Preply alternative for kids',
  'Cambridge English tutor online',
  'Oxford English classes online',
  'English speaking class for children',
  'online ESL tutor for kids',
  'English classes for Chinese students',
  'one to one English lessons for kids',
]

const topicBlueprints = [
  {
    slug: 'online-english-classes-for-kids',
    title: 'Online English Classes for Kids: What Parents Should Look For',
    keyword: 'online English classes for kids',
    intent: 'commercial investigation',
  },
  {
    slug: 'novakid-alternative',
    title: 'Novakid Alternative: A More Personal 1-to-1 English Option',
    keyword: 'Novakid alternative',
    intent: 'comparison',
  },
  {
    slug: '51talk-alternative',
    title: '51Talk Alternative for Kids: Flexible Online English Lessons',
    keyword: '51Talk alternative',
    intent: 'comparison',
  },
  {
    slug: 'preply-alternative-for-kids',
    title: 'Preply Alternative for Kids: Guided Online English Tutoring',
    keyword: 'Preply alternative for kids',
    intent: 'comparison',
  },
  {
    slug: 'cambridge-english-tutor-online',
    title: 'Cambridge English Tutor Online for Primary and Secondary Learners',
    keyword: 'Cambridge English tutor online',
    intent: 'service page',
  },
  {
    slug: 'english-classes-for-chinese-students',
    title: 'Online English Classes for Chinese Students: VooV-Friendly Learning',
    keyword: 'English classes for Chinese students',
    intent: 'geo-specific service page',
  },
]

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function readFiles(dir, extensions = ['.html', '.jsx', '.js', '.md']) {
  const results = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'release', '.git'].includes(entry.name)) results.push(...readFiles(full, extensions))
    } else if (extensions.includes(path.extname(entry.name))) results.push(full)
  }
  return results
}

function extractText(file) {
  return fs.readFileSync(file, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[{}()[\]`*_#>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function existingContentIndex() {
  const files = [...readFiles(path.join(root, 'src')), ...readFiles(publicDir)]
  return files.map((file) => ({
    file: path.relative(root, file),
    text: extractText(file),
  }))
}

function keywordCoverage(index, keyword) {
  const terms = keyword.toLowerCase().split(/\s+/).filter((word) => word.length > 2)
  return index.reduce((score, item) => {
    const text = item.text.toLowerCase()
    const hits = terms.filter((term) => text.includes(term)).length
    return Math.max(score, Math.round((hits / terms.length) * 100))
  }, 0)
}

function generateDraft(topic) {
  const date = new Date().toISOString().slice(0, 10)
  return `---
title: "${topic.title}"
description: "A parent-friendly guide from TutorPro English PH about ${topic.keyword}."
keyword: "${topic.keyword}"
intent: "${topic.intent}"
status: "draft - human review required"
created: "${date}"
---

# ${topic.title}

> Editorial note: This is an AI-assisted first draft. Review facts, tone, pricing, links, and claims before publishing.

## Quick answer

TutorPro English PH offers personalised 1-to-1 online English lessons for children and teens. Families comparing platforms such as Novakid, 51Talk, Preply, and other online English class providers may choose TutorPro when they want a more guided, parent-supported learning experience.

## Who this is for

This option is best for parents who want:

- a dedicated online English tutor experience
- flexible weekly or monthly lesson packages
- Cambridge and Oxford-aligned English support
- speaking confidence, grammar, reading, and writing practice
- parent dashboard access and post-class feedback

## Why parents compare options

Parents often search for **${topic.keyword}** because they want to understand price, teacher consistency, class quality, feedback, and scheduling. A good online English programme should make it easy to book classes, track progress, and communicate with support.

## How TutorPro English PH helps

TutorPro English PH focuses on 1-to-1 online instruction. Lessons can be adjusted to each learner’s school year, curriculum, confidence level, and learning goals. Parents can access booking tools, feedback, payment options, and support from one dashboard.

## What to check before choosing a provider

1. Does the platform offer real teacher feedback after class?
2. Can parents book times easily?
3. Are classes aligned with your child’s curriculum?
4. Is there support for your country and payment method?
5. Is there a classroom backup plan for China or low-bandwidth users?

## Suggested internal links

- [TutorPro English homepage](${siteUrl}/)
- [Novakid, 51Talk and Preply alternative guide](${siteUrl}/online-english-alternatives.html)
- [China mobile student page](${siteUrl}/cn/)

## Call to action

Book a free first class with TutorPro English PH and see whether the learning style fits your child.

[Start at TutorPro English](${siteUrl}/)
`
}

function run() {
  ensureDir(outDir)
  ensureDir(path.join(outDir, 'drafts'))
  const index = existingContentIndex()
  const ideas = topicBlueprints.map((topic) => ({
    ...topic,
    coverageScore: keywordCoverage(index, topic.keyword),
    priority: keywordCoverage(index, topic.keyword) < 45 ? 'high' : 'medium',
    suggestedUrl: `${siteUrl}/${topic.slug}.html`,
  }))

  const contentGaps = seedKeywords.map((keyword) => ({
    keyword,
    coverageScore: keywordCoverage(index, keyword),
    gap: keywordCoverage(index, keyword) < 45,
  })).filter((item) => item.gap)

  const internalLinks = [
    { from: '/', to: '/online-english-alternatives.html', anchor: 'Novakid, 51Talk and Preply alternative' },
    { from: '/', to: '/cn/', anchor: 'Chinese mobile student version' },
    { from: '/online-english-alternatives.html', to: '/', anchor: 'online English classes for kids' },
    { from: '/online-english-alternatives.html', to: '/cn/', anchor: 'English classes for Chinese students' },
  ]

  const rankingTemplate = seedKeywords.map((keyword) => ({
    keyword,
    targetUrl: keyword.includes('Chinese') ? `${siteUrl}/cn/` : keyword.includes('alternative') ? `${siteUrl}/online-english-alternatives.html` : siteUrl,
    currentRank: null,
    previousRank: null,
    note: 'Connect Google Search Console API or manually update until API credentials are configured.',
  }))

  for (const topic of ideas) {
    fs.writeFileSync(path.join(outDir, 'drafts', `${topic.slug}.md`), generateDraft(topic))
  }

  const report = {
    generatedAt: new Date().toISOString(),
    reviewRequired: true,
    articleIdeas: ideas,
    contentGaps,
    recommendedInternalLinks: internalLinks,
    keywordRankingMonitorTemplate: rankingTemplate,
  }

  fs.writeFileSync(path.join(outDir, 'seo-report.json'), JSON.stringify(report, null, 2))
  fs.writeFileSync(path.join(outDir, 'seo-report.md'), `# TutorPro SEO Automation Report\n\nGenerated: ${report.generatedAt}\n\n## Article ideas\n\n${ideas.map((item) => `- **${item.title}** — ${item.keyword} — Priority: ${item.priority} — Coverage: ${item.coverageScore}%`).join('\n')}\n\n## Content gaps\n\n${contentGaps.map((item) => `- ${item.keyword} — Coverage: ${item.coverageScore}%`).join('\n')}\n\n## Internal links\n\n${internalLinks.map((item) => `- ${item.from} → ${item.to} using anchor: "${item.anchor}"`).join('\n')}\n\n## Reminder\n\nAlways review AI-generated drafts before publishing.\n`)

  console.log(`SEO automation complete. Open ${path.relative(root, outDir)}/seo-report.md`)
}

run()
