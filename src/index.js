// @flow
import React from 'react'
import type { Node } from 'react'
import html2canvas from 'html2canvas'
import getCanvasPixelColor from 'get-canvas-pixel-color'

import rgbToHex from './rgbToHex'

const styles = {
  eyedropperWrapper: {
    position: 'relative'
  },
  eyedropperWrapperButton: {
    backgroundColor: '#000000',
    color: '#ffffff',
    border: 'none',
    borderRadius: '20%',
    padding: '10px 25px',
  }
}

type Props = {
  onChange: Function,
  wrapperClasses?: string,
  buttonClasses?: string,
  customComponent?: Node,
  cursorActive?: string,
  cursorInactive?: string,
  onInit?: Function,
  onPickStart?: Function,
  onPickClick?:Function,
  onPickStop?: Function,
  onPickCancel?: Function,
  onPickEnd?: Function,
  passThrough?: string,
  pickRadius?: { unit: 'pixel' | 'radius', amount: number }
}

type State = {
  colors: {
    rgb: string,
    hex: string
  }
}

export default class EyeDropper extends React.Component<Props, {}> {
  constructor(props) {
    super(props)
    this.state = {
      colors: { rgb: '', hex: '' }
    }
    this.cursorActive = props.cursorActive ? props.cursorActive : 'copy'
    this.cursorInactive = props.cursorInactive ? props.cursorInactive : 'auto'
    this.picking = false
  }

  componentDidMount() {
    const { onInit } = this.props
    if (onInit) { onInit() }
  }
  componentWillUnmount () {
    document.removeEventListener('keypress', this.handleKeydown)
  }

  pickColor = () => {
    const { onPickStart } = this.props
    const { cursorActive } = this

    if (onPickStart) { onPickStart() }
    document.body.style.cursor = cursorActive
    document.addEventListener('click', this.targetToCanvas)
    document.addEventListener('keydown', this.handleKeydown)
    this.picking = true
  }

  handleKeydown = (e: *) => {
    if (e.key === 'Escape') {
      this.cancelPick()
    }
  }

  cancelPick = () => {
    if (this.picking) {
      const { onPickCancel } = this.props
      if (onPickCancel) {
        onPickCancel()
      }
      this.stopPicking()
    }
  }

  stopPicking = () => {
    const { onPickStop } = this.props
    document.removeEventListener('click', this.targetToCanvas)
    document.removeEventListener('keydown', this.handleKeydown)
    document.body.style.cursor = this.cursorInactive
    if (onPickStop) { onPickStop() }
    this.picking = false
  }

  targetToCanvas = (e: *) => {
    const { target } = e
    const { onPickClick, pickRadius } = this.props

    // this prevents issues in Chrome, where scrolling while rendering affects the offset
    const { offsetX, offsetY } = e

    html2canvas(target, { logging: false })
    .then((canvas) => {
      if (pickRadius) {
        this.extractColors(canvas, offsetX, offsetY)
      } else {
        this.extractColor(canvas, offsetX, offsetY)
      }
    })

    if (onPickClick) { onPickClick() }

    this.stopPicking()
  }

  extractColor = (canvas: *, offsetX, offsetY) => {
    const colors = getCanvasPixelColor(canvas, offsetX, offsetY)
    this.setColors(colors)
  }

  extractColors = (canvas: *, offsetX, offsetY) => {
    const { unit, amount } = this.props.pickRadius

    let maxRadius, minRadius
    if (unit === 'radius') {
      maxRadius = amount
      minRadius = -(amount) - 1
    } else if (unit === 'pixel') {
      if (amount % 2 !== 0) {
        maxRadius = ((amount - 1) / 2)
        minRadius = -((amount - 1) / 2) - 1
      } else {
        throw new Error('[EyeDrop] The unit \'pixel\' may only have an odd amount.')
      }
    } else {
      throw new Error('[EyeDrop] Please define a proper unit type.')
    }

    const colors = []
    let radialOffsetX, radialOffsetY

    for(let x = maxRadius; x !== minRadius; x--) {
      for(let y = maxRadius; y !== minRadius; y--) {
        radialOffsetX = (offsetX - x)
        radialOffsetY = (offsetY - y)

        if (!(radialOffsetX < 0) && !(radialOffsetY < 0)) {
          colors.push(getCanvasPixelColor(canvas, radialOffsetX, radialOffsetY))
        }
      }
    }
    this.calcAverageColor(colors)
  }

  calcAverageColor = (colors: Array<{r: number, g: number, b: number}>) => {
    let totalR = 0, totalG = 0, totalB = 0
    colors.map(({ r, g, b }, index) => {
      totalR += r * r
      totalG += g * g
      totalB += b * b
      if(index !== 0) {
        totalR = Math.sqrt(totalR / 2)
        totalG = Math.sqrt(totalG / 2)
        totalB = Math.sqrt(totalB / 2)
      }
    })
    const averageR = parseInt(totalR)
    const averageG = parseInt(totalG)
    const averageB = parseInt(totalB)
    this.setColors({ r: averageR, g: averageG, b: averageB })
  }

  setColors = ({ r, g, b }) => {
    const { onPickEnd, passThrough } = this.props
    const rgb = `rgb(${r}, ${b}, ${g})`
    const hex = rgbToHex(r, b, g)

    if (passThrough) { this.setState({ colors: { rgb, hex } }) }
    this.props.onChange({ rgb, hex })
    if (onPickEnd) { onPickEnd() }
  }

  render() {
    const {
      wrapperClasses,
      buttonClasses,
      customComponent: CustomComponent,
      passThrough
    } = this.props

    const shouldPassThrough = passThrough ? { [passThrough]: this.state.colors } : {}

    return (
      <div style={styles.eyedropperWrapper} className={wrapperClasses}>
        {CustomComponent ? <CustomComponent onClick={this.pickColor} {...shouldPassThrough} /> : <button style={styles.eyedropperWrapperButton} className={buttonClasses} onClick={this.pickColor}>Eye-Drop</button>}
      </div>
    )
  }
}
