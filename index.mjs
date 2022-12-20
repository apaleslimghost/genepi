import { Client } from '@googlemaps/google-maps-services-js'
import * as geolib from 'geolib'
import Sparkline from 'sparkline-svg'
import fs from 'node:fs/promises'

const client = new Client({})

const start = { lat: 45.31692799142987, lon: 6.525043787857102}
const bearing = 130
const steps = 10
const spacing = 1000
const width = 6000

async function slice({ origin, bearing, width, distance }) {
	const centre = geolib.computeDestinationPoint(
		origin,
		distance,
		bearing
	)

	const leftPoint = geolib.computeDestinationPoint(
		centre,
		width,
		bearing - 90
	)

	const rightPoint = geolib.computeDestinationPoint(
		centre,
		width,
		bearing + 90
	)

	const {data: {results}} = await client.elevation({
		params: {
			path: [leftPoint, rightPoint],
			samples: Math.min(500, width * 2),
			key: process.env.GOOGLE_MAPS_API_KEY
		}
	})


	return results
}

const results = await Promise.all(Array.from({ length: steps }, (_, i) => slice({
	origin: start,
	bearing,
	distance: (i + 1) * spacing,
	width
})))

const lines = results.map(slice => {
	const line = new Sparkline.default(slice.map(point => point.elevation))
	return line.d
})

const paths = lines.map((line, i) => `
	<path
		style="transform: translateY(${(steps - i - 1) * 100 / steps}%) scaleY(30%)"
		fill="transparent"
		stroke="currentColor"
		strokeWidth="1%"
		d="${line}" />
`)

const svg = `<?xml version="1.0" encoding="utf-8"?>
<svg
	height="100%"
	preserveAspectRatio="none"
	version="1.1"
	viewBox="0 0 100 100"
	x="0px"
	xml:space="preserve"
	xmlns="http://www.w3.org/2000/svg"
	xmlns:xlink="http://www.w3.org/1999/xlink"
	y="0px"
	width="100%"
>
	${paths.join('\n')}
</svg>`

await fs.writeFile('test.svg', svg)
