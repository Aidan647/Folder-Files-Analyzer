#!/usr/bin/env node
import { readdir } from "fs/promises"
import { extname, resolve } from "path"
import { getType } from "mime"
import { Table } from "console-table-printer"
import yargs from "yargs"

const options = yargs.usage("Usage: mimedata [folder]").argv

async function* getFiles(dir: string): AsyncGenerator<[string, string]> {
	const dirents = await readdir(dir, { withFileTypes: true })
	for (const dirent of dirents) {
		const res = resolve(dir, dirent.name)
		if (dirent.isDirectory()) {
			yield* getFiles(res)
		} else {
			yield [res, dirent.name]
		}
	}
}

class type {
	mime: string
	extension: string
	count: number
	percent: string
	constructor(ext: string) {
		this.mime = getType(ext) ?? ""
		this.extension = ext
		this.count = 1
		this.percent = "0.00%"
	}
	add() {
		this.count++
	}
	get(total: number) {
		this.percent = ((this.count / total) * 100).toFixed(2) + "%"
		return this
	}
}

;(async () => {
	const total: { [mime: string]: type } = {}
	var count = 0
	for await (const f of getFiles((await options)?.["_"]?.[0]?.toString() ?? ".")) {
		// console.log(getType(f[0]))
		const ext = extname(f[0]) || f[1]
		if (total[ext]) total[ext].add()
		else total[ext] = new type(ext)
		count++
	}
	const t = new Table({
		sort: (row1, row2) => {
			if (row1.extension == "other") return Infinity
			return row2.count - row1.count
		},
	})
	const values = Object.values(total).sort((x, y) => {
		return y.count - x.count
	})
	if (values.length > 50) {
		values.slice(0, 49).forEach((data: type) => {
			t.addRow(data.get(count))
		})
		const files = values.slice(50).reduce((x, y) => {
			x += y.count
			return x
		}, 0)
		// console.log(files)
		t.addRow(
			{
				extension: "other",
				count: files,
				percent: ((files / count) * 100).toFixed(2) + "%",
			},
			{ color: "cyan" }
		)
	} else
		values.forEach((data: type) => {
			t.addRow(data.get(count))
		})
	t.printTable()
	// console.table(total, ["extension", "count"])
})()
