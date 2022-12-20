import { Client } from '@googlemaps/google-maps-services-js'
import * as geolib from 'geolib'
import Sparkline from 'sparkline-svg'
import fs from 'node:fs/promises'
import minimist from 'minimist'

const client = new Client({})

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

function getElevationSlices({ origin, bearing, steps, spacing, width }) {
	return Promise.all(Array.from({ length: steps }, (_, i) => slice({
		origin,
		bearing,
		distance: (i + 1) * spacing,
		width
	})))
}

function formatSvg(results, { steps }) {
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

	return `<?xml version="1.0" encoding="utf-8"?>
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
}

async function main({ lat, lon, bearing, steps = 10, spacing = 1000, width = 6000, output = 'out.svg' }) {
	const origin = {
		lat: parseFloat(lat),
		lon: parseFloat(lon),
	}

	const data = await getElevationSlices({ origin, bearing: parseFloat(bearing), steps, spacing, width })
	const svg = formatSvg(data, {steps})

	await fs.writeFile(output, svg)
}

await main(minimist(process.argv.slice(2)))
