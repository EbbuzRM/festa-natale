import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 18, ...rest }: Props) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    ...rest,
  }
}

export function IconLedger(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M5 3.5h11L19 6.5v14H5z" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" />
    </svg>
  )
}

export function IconBook(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M5 4.5h9.5A2.5 2.5 0 0 1 17 7v13H7.5A2.5 2.5 0 0 1 5 17.5z" />
      <path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H17" />
      <path d="M9 8h4" />
    </svg>
  )
}

export function IconList(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 7h1M4.5 12h1M4.5 17h1" />
      <path d="M9 7h10.5M9 12h10.5M9 17h10.5" />
    </svg>
  )
}

export function IconNote(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 4.5h15v10l-4.5 4.5h-10.5z" />
      <path d="M15 19v-4.5h4.5" />
      <path d="M8 9h8M8 12.5h5" />
    </svg>
  )
}

export function IconCalendar(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 6.5h17v14h-17z" />
      <path d="M3.5 10.5h17M8 4v4M16 4v4" />
      <path d="M7.5 14h2M14.5 14h2M7.5 17h2" />
    </svg>
  )
}

export function IconSliders(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M4 7.5h16M4 16.5h16" />
      <path d="M9 5v5M15 14v5" />
    </svg>
  )
}

export function IconPlus(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconClose(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function IconChevron({ direction = 'right', ...props }: Props & { direction?: 'left' | 'right' }) {
  return (
    <svg {...base(props)}>
      <path d={direction === 'left' ? 'M14.5 5.5 8 12l6.5 6.5' : 'M9.5 5.5 16 12l-6.5 6.5'} />
    </svg>
  )
}

export function IconArrow(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M5 12h13M12.5 6l6 6-6 6" />
    </svg>
  )
}
