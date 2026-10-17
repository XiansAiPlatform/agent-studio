// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PaginationBar } from './pagination-bar'

describe('PaginationBar', () => {
  afterEach(() => {
    cleanup()
  })

  it('hides itself when there is only one page', () => {
    const { container } = render(
      <PaginationBar page={1} totalPages={1} onPageChange={() => {}} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('hides a cursor pager that cannot move', () => {
    const { container } = render(
      <PaginationBar page={1} hasNext={false} onPageChange={() => {}} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('keeps the total count on a single page but drops the arrows', () => {
    render(
      <PaginationBar
        page={1}
        totalPages={1}
        totalCount={12}
        itemNoun="log"
        onPageChange={() => {}}
      />
    )

    expect(screen.getByText('12 logs')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('pages forward and back from a middle page', () => {
    const onPageChange = vi.fn()
    render(
      <PaginationBar
        page={2}
        totalPages={4}
        totalCount={80}
        itemNoun="log"
        onPageChange={onPageChange}
      />
    )

    expect(screen.getByText('Page 2 of 4 · 80 logs')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenNthCalledWith(1, 1)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3)
  })

  it('disables next when the API reports no further page', () => {
    render(<PaginationBar page={2} hasNext={false} onPageChange={() => {}} />)

    expect(screen.getByText('Page 2')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next page' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Previous page' }).hasAttribute('disabled')).toBe(false)
  })

  it('uses a compact page indicator', () => {
    render(
      <PaginationBar variant="compact" page={1} totalPages={3} onPageChange={() => {}} />
    )

    expect(screen.getByText('1 / 3')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Previous page' }).hasAttribute('disabled')).toBe(true)
  })
})
