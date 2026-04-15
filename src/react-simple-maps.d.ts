declare module 'react-simple-maps' {
  import * as React from 'react'

  export interface ComposableMapProps extends React.SVGProps<SVGSVGElement> {
    projection?: string
    projectionConfig?: Record<string, unknown>
    width?: number
    height?: number
  }
  export const ComposableMap: React.FC<ComposableMapProps>

  export interface ZoomableGroupProps {
    zoom?: number
    minZoom?: number
    maxZoom?: number
    center?: [number, number]
    onMoveStart?: (pos: { zoom: number; coordinates: [number, number] }) => void
    onMove?: (pos: { zoom: number; coordinates: [number, number] }) => void
    onMoveEnd?: (pos: { zoom: number; coordinates: [number, number] }) => void
    translateExtent?: [[number, number], [number, number]]
    children?: React.ReactNode
  }
  export const ZoomableGroup: React.FC<ZoomableGroupProps>

  export interface GeographiesProps {
    geography: string | Record<string, unknown>
    children: (props: { geographies: any[] }) => React.ReactNode
  }
  export const Geographies: React.FC<GeographiesProps>

  export interface GeographyProps extends React.SVGProps<SVGPathElement> {
    geography: any
    className?: string
  }
  export const Geography: React.FC<GeographyProps>

  export interface MarkerProps extends React.SVGProps<SVGGElement> {
    coordinates: [number, number]
    children?: React.ReactNode
  }
  export const Marker: React.FC<MarkerProps>

  export interface LineProps extends React.SVGProps<SVGPathElement> {
    from: [number, number]
    to: [number, number]
  }
  export const Line: React.FC<LineProps>

  export interface AnnotationProps extends React.SVGProps<SVGGElement> {
    subject: [number, number]
    dx?: number
    dy?: number
    children?: React.ReactNode
  }
  export const Annotation: React.FC<AnnotationProps>
}
