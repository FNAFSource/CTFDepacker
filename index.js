/**
 * Copyright (c) 2018 PROPHESSOR
 * 
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

'use strict';

const fs = require('fs');
const path = require('path');

// const GameData = require('./GameData');
const { PackData } = require('./PackData');

class CTFExecutable {
	constructor(game_file = '/home/prophessor/Загрузки/ultimate-custom-night.exe') {
		this.game_file = game_file;
		this.reader = fs.readFileSync(game_file);
		this.settings = {
			dump: {
				images: false,
				icon: false,
				sounds: false,
				music: false,
				chunks: false
			}
		}

		if (this.reader.toString('ascii', 0, 2) !== 'MZ') {
			throw new Error(`Invalid executable signature! ${this.reader.toString('ascii', 0, 2)} !== 'MZ'`);
		}

		this.pack_data = null;
		// this.game_data = new GameData(this.reader); // TODO:
	}

	parse_exe() {
		const reader = this.reader;
		let offset = 60;

		const hdr_offset = reader.readUInt16LE(offset);
		offset += 2;

		offset = hdr_offset;

		if (reader.toString('ascii', offset, offset + 4) !== 'PE\x00\x00') {
			throw new Error('Invalid PE executable signature');
		}

		offset += 6;

		const num_of_sections = reader.readUInt16LE(offset);
		offset += 2;

		offset += 16;

		const optional_header = 28 + 68;

		const data_dir = 16 * 8;

		offset += optional_header + data_dir;

		let position = 0;

		for (let i = 0; i < num_of_sections; i++) {
			const entry = offset;
			console.log(`for entry = ${entry}`);
			let section_name = null;
			{
				const section_name_array = [];
				let off = 0;
				while (reader.readUInt8(entry + off) !== 0) {
					section_name_array.push(String.fromCharCode(reader.readUInt8(entry + off++)));
				}
				section_name = section_name_array.join('');
				offset += off;
			}

			console.log(`Section name = ${section_name}`)

			if (section_name === '.extra') {
				offset = entry + 20;
				position = reader.readUInt32LE(offset);
				offset += 4;
				break;
			} else if (i >= num_of_sections - 1) {
				offset = entry + 16;
				const size = reader.readUInt32LE(offset);
				offset += 4; // 680

				const address = reader.readUInt32LE(offset);
				offset += 4; // 684

				console.log(`address = 0x${address.toString(10)}, size = ${size}`)

				position = address + size;
				break;
			}

			offset = entry + 40;
		}

		offset = position;
		console.log(offset);
		const first_short = reader.readInt16LE(offset);
		console.log(`first_short = ${first_short}`);

		const pame_magic = 0;
		const pack_magic = reader.slice(offset, offset + 8); //1083393

		if (first_short === 8748) {
			console.warn(`Old version`);
		} else if (pack_magic.equals(Buffer.from([0x77, 0x77, 0x77, 0x77, 0x49, 0x87, 0x47, 0x12]))) {
			console.log('Found PackData header!\nReading PackData header.');
			this.pack_data = new PackData(this.reader, offset); // TODO:
			this.pack_data.read()
			// if self.settings.get('DUMPPACK', False) or self.settings.get('DUMPEVERYTHING', False):
			//     print('Dumping packed files!')
			//     for f in self.pack_data.items:
			//         f.dump()
		} else {
			throw new Error('Failed to found any known headers');
		}

		console.log(pack_magic);
	}

	prepare_folders() {
		const cur_path = __dirname;
		const game = this.game_file.split(/[\/\\]/).pop().split('.')[0];
		console.log(game);
		const dump_path = path.join(cur_path, 'DUMP', game);

		try { fs.mkdirSync(path.join(cur_path, 'DUMP')); } catch (e) { }
		try { fs.mkdirSync(dump_path); } catch (e) { }
		try { fs.mkdirSync(path.join(dump_path, 'LOG')); } catch (e) { }
		try { fs.mkdirSync(path.join(dump_path, 'CHUNKS')); } catch (e) { }
		try { fs.mkdirSync(path.join(dump_path, 'CHUNKS', 'OBJECTINFO')); } catch (e) { }
		try { fs.mkdirSync(path.join(dump_path, 'CHUNKS', 'FRAMES')); } catch (e) { }
		try { fs.mkdirSync(path.join(dump_path, 'ImageBank')); } catch (e) { }
		try { fs.mkdirSync(path.join(dump_path, 'SoundBank')); } catch (e) { }
		try { fs.mkdirSync(path.join(dump_path, 'MusicBank')); } catch (e) { }
		try { fs.mkdirSync(path.join(dump_path, 'extensions')); } catch (e) { }
	}
}

if (!module.parent) {
	const a = new CTFExecutable();
	a.prepare_folders();
	a.parse_exe();
}