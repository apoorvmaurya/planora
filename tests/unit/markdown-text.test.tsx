import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MarkdownText } from '@/components/shared/MarkdownText'

describe('MarkdownText Component', () => {
  it('renders bold text properly', () => {
    const { container } = render(<MarkdownText content="This is **bold** text." />)
    const strong = container.querySelector('strong')
    expect(strong).not.toBeNull()
    expect(strong?.textContent).toBe('bold')
  })

  it('renders unordered bullet lists', () => {
    const markdown = `
Here are options:
- Option A: $20
- Option B: $40
`
    const { container } = render(<MarkdownText content={markdown} />)
    const ul = container.querySelector('ul')
    expect(ul).not.toBeNull()
    const lis = container.querySelectorAll('li')
    expect(lis.length).toBe(2)
    expect(lis[0].textContent).toContain('Option A: $20')
  })

  it('renders numbered ordered lists', () => {
    const markdown = `
Steps:
1. Book flight
2. Check in
`
    const { container } = render(<MarkdownText content={markdown} />)
    const ol = container.querySelector('ol')
    expect(ol).not.toBeNull()
    const lis = container.querySelectorAll('li')
    expect(lis.length).toBe(2)
  })

  it('renders headings and inline code', () => {
    const markdown = `
### Tokyo Highlights
Try the \`JR Pass\` for transit.
`
    const { container } = render(<MarkdownText content={markdown} />)
    const h4 = container.querySelector('h4')
    expect(h4).not.toBeNull()
    expect(h4?.textContent).toBe('Tokyo Highlights')

    const code = container.querySelector('code')
    expect(code).not.toBeNull()
    expect(code?.textContent).toBe('JR Pass')
  })

  it('renders links properly', () => {
    const markdown = `Visit [Planora](https://planora.com) today.`
    const { container } = render(<MarkdownText content={markdown} />)
    const a = container.querySelector('a')
    expect(a).not.toBeNull()
    expect(a?.textContent).toBe('Planora')
    expect(a?.getAttribute('href')).toBe('https://planora.com')
  })
})
