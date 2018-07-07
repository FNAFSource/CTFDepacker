/**
 * Copyright (c) 2018 PROPHESSOR
 * 
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

'use strict';

exports.PackFile = class PackFile {
	constructor(reader = new Buffer, offset = new Number) {
		this.reader = reader;
		this.start = offset;
		this.bingo = 0;
		this.data = new Buffer([]);
	}

	read() {
		const { reader, start } = this;
		console.log(`[PackFile.read] Start = ${start}`);
		let offset = start;

		const filename_size = reader.readUInt16LE(offset);
		offset += 2;

		this.filename = reader.toString('ascii', offset, offset + filename_size * 2 + 2).replace(/\x00/g, '');
		offset += filename_size * 2 + 4; // FIXME: +4

		// TODO: Check bingo

		const data_size = reader.readUInt32LE(offset);
		offset += 4;
		console.log(`data size = ${data_size}`)

		this.data = reader.slice(offset, offset + data_size);

		console.info(`\tFile "${this.filename}" size: ${this.data.length}`);

		console.log(`offset = ${offset}`); //1083452
	}
}

exports.PackData = class PackData {
	constructor(reader, position) {
		this.reader = Buffer.from(reader); // TODO: Remove Buffer.from
		this.format_version = null;
		this.items = [];
		this.start = position;
		this.settings = {}
	}

	read() {
		const { reader, start } = this;
		console.log(`[PackData.read] Start offset = ${start}`)

		let offset = start;

		const header = reader.slice(offset, offset + 8);

		if (!header.equals(Buffer.from([0x77, 0x77, 0x77, 0x77, 0x49, 0x87, 0x47, 0x12]))) {
			throw new Error('CRITICAL ERROR, invalid pack header');
		}
		offset += header.length;

		const header_size = reader.readUInt32LE(offset);
		offset += 4;
		console.log(`header size = ${header_size}`);

		const data_size = reader.readUInt32LE(offset);
		offset += 4;
		console.log(`data size = ${header_size}`);

		offset = start + data_size - 32;

		// console.log(`[PackData.read] offset = ${offset}`);

		if (reader.toString('ascii', offset, offset + 4) === 'PAMU') {
			this.settings.unicode = true;
		}

		offset = start + 16 + 3; // FIXME: +3
		this.format_version = reader.readUInt32LE(offset);
		offset += 4;
		console.log(`format version = ${this.format_version}`);

		offset += 5;//8; //FIXME: +8

		const count = reader.readUInt32LE(offset);
		offset += 4;
		console.log(`Found ${count} packed files:`);
		// now offset = start + header_size(32)

		function check(reader = Buffer.from(), offset, size) {
			let zerooffset = 0;
			while (reader.readUInt8(offset + zerooffset) !== 0) zerooffset++;
			return zerooffset >= size;
		}

		for (let i = 0; i < count; i++) {
			if (!check(reader, offset, 2)) break;
			let value = reader.readUInt16LE(offset);
			offset += 2;
			console.log(`value1 = ${value}`);
			if (!check(reader, offset, value)) break;
			offset += value;
			if (!check(reader, offset, 4)) break;
			value = reader.readUInt32LE(offset);
			console.log(`value2 = ${value}`);
			if (!check(reader, offset, value)) break;
			offset += value;
		}

		console.log(`End: offset = ${offset}`);

		// TODO: Bingo
		this.items = [];

		for (let i = 0; i < count; i++) {
			this.items[i] = new exports.PackFile(reader, offset).read();
		}

		// return this;
	}
}