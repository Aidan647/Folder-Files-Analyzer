#!/usr/bin/env node
import { readdir, stat } from "fs/promises"
import { extname, resolve } from "path"
import { getType } from "mime"
import { Table } from "console-table-printer"
import yargs from "yargs"



async function* getFiles(dir: string): AsyncGenerator<[string, string, number]> {
	try {
		const dirents = await readdir(dir, { withFileTypes: true })
		for (const dirent of dirents) {
			const res = resolve(dir, dirent.name)
			if (dirent.isDirectory()) {
				yield* getFiles(res)
			} else {
				yield [res, dirent.name, (await stat(res)).size]
			}
		}
	} catch (error) {}
}

class type {
	mime: string
	extension: string
	count: number
	percent: string
	size: number
	sizePercent: string
	constructor(ext: string, size: number) {
		this.mime = getType(ext) ?? ""
		this.extension = ext
		this.count = 1
		this.percent = "0.00%"
		this.size = size
		this.sizePercent = "0.00%"
	}
	add(size: number) {
		this.size += size
		this.count++
	}
	get(total: number, sizeTotal: number) {
		this.percent = ((this.count / total) * 100).toFixed(2) + "%"
		this.sizePercent = ((this.size / sizeTotal) * 100).toFixed(2) + "%"
		return this
	}
}

;(async () => {
	const total: { [mime: string]: type } = {}
	var count = 0
	var sizeTotal = 0
	const options = await yargs
		.usage("Usage: mimedata [folder]")
		.option("size", {
			alias: "s",
			describe: "sort by size",
			boolean: true,
		})
		.alias("help", "h")
		.alias("version", "v").argv
	for await (const f of getFiles(options?.["_"]?.[0]?.toString() ?? ".")) {
		// console.log(getType(f[0]))
		const ext = extname(f[0]) || f[1]
		if (total[ext]) total[ext].add(f[2])
		else total[ext] = new type(ext, f[2])
		sizeTotal += f[2]
		count++
	}
	const t = new Table({
		sort: (x, y) => {
			if (x.extension == "other") return Infinity
			if (options.s) return y.size - x.size
			return y.count - x.count
		},
	})
	console.log(options.s)
	const values = Object.values(total).sort((x, y) => {
		if (options.s) return y.size - x.size
		return y.count - x.count
	})
	if (values.length > 50) {
		values.slice(0, 49).forEach((data: type) => {
			t.addRow(data.get(count, sizeTotal))
		})
		const files = values.slice(50).reduce(
			(x, y) => {
				x[0] += y.count
				x[1] += y.size
				return x
			},
			[0, 0]
		)
		// console.log(files)
		t.addRow(
			{
				extension: "other",
				count: files[0],
				percent: ((files[0] / count) * 100).toFixed(2) + "%",
				size: files[1],
				sizePercent: ((files[1] / sizeTotal) * 100).toFixed(2) + "%",
			},
			{ color: "cyan" }
		)
	} else
		values.forEach((data: type) => {
			t.addRow(data.get(count, sizeTotal))
		})
	t.printTable()
	// console.table(total, ["extension", "count"])
})()
