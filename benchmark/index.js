import { performance } from 'node:perf_hooks';
import { walk } from '../src/walk.js';

const tree = create_tree(5, 4);
const leaf_replacement = { type: 'Leaf', value: -1 };
let sink = 0;

const benchmarks = [
	{
		name: 'default read-only',
		run() {
			const result = walk(tree, null, {});
			sink ^= result.children.length;
		}
	},
	{
		name: 'specialized read-only',
		run() {
			const result = walk(tree, null, {
				Node(_, { next }) {
					next();
				}
			});
			sink ^= result.children.length;
		}
	},
	{
		name: 'universal read-only',
		run() {
			const result = walk(tree, null, {
				_(_, { next }) {
					next();
				}
			});
			sink ^= result.children.length;
		}
	},
	{
		name: 'universal + specialized',
		run() {
			const result = walk(tree, null, {
				_(_, { next }) {
					next();
				},
				Node(_, { next }) {
					next();
				}
			});
			sink ^= result.children.length;
		}
	},
	{
		name: 'manual visit read-only',
		run() {
			const result = walk(tree, null, {
				Node(node, { visit }) {
					for (const child of node.children) visit(child);
				}
			});
			sink ^= result.children.length;
		}
	},
	{
		name: 'sparse mutation',
		run() {
			const result = walk(tree, null, {
				Leaf(node) {
					if (node.value % 64 === 0) return leaf_replacement;
				}
			});
			sink ^= result.children.length;
		}
	},
	{
		name: 'dense mutation',
		run() {
			const result = walk(tree, null, {
				Leaf() {
					return leaf_replacement;
				}
			});
			sink ^= result.children.length;
		}
	}
];

console.log(`Node ${process.version}; ${count_nodes(tree)} AST nodes`);
console.log('');

for (const benchmark of benchmarks) {
	const iterations = calibrate(benchmark.run);
	const samples = [];

	for (let i = 0; i < 10; i += 1) {
		const start = performance.now();
		for (let j = 0; j < iterations; j += 1) benchmark.run();
		const elapsed = performance.now() - start;
		samples.push((iterations * 1000) / elapsed);
	}

	samples.sort((a, b) => a - b);
	const median = (samples[4] + samples[5]) / 2;
	const deviation = ((samples[9] - samples[0]) * 100) / median;
	console.log(
		`${benchmark.name.padEnd(26)} ${median.toFixed(1).padStart(10)} ops/s  range ${deviation.toFixed(1)}%`
	);
}

if (sink === -1) console.log(sink);

/** @param {() => void} run */
function calibrate(run) {
	const warmup_end = performance.now() + 250;
	while (performance.now() < warmup_end) run();

	let iterations = 1;
	while (true) {
		const start = performance.now();
		for (let i = 0; i < iterations; i += 1) run();
		if (performance.now() - start >= 100) return iterations;
		iterations *= 2;
	}
}

/**
 * @param {number} depth
 * @param {number} width
 * @param {{ value: number }} [counter]
 * @returns {{ type: string } & Record<string, any>}
 */
function create_tree(depth, width, counter = { value: 0 }) {
	if (depth === 0) {
		return { type: 'Leaf', value: counter.value++ };
	}

	return {
		type: 'Node',
		start: counter.value,
		metadata: { visited: false },
		children: Array.from({ length: width }, () =>
			create_tree(depth - 1, width, counter)
		)
	};
}

/**
 * @param {ReturnType<typeof create_tree>} node
 * @returns {number}
 */
function count_nodes(node) {
	return (
		1 +
		('children' in node
			? node.children.reduce(
					(/** @type {number} */ total, /** @type {any} */ child) =>
						total + count_nodes(child),
					0
			  )
			: 0)
	);
}
