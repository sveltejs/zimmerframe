import { expect, test } from 'vitest';
import { walk, walk_readonly } from '../src/walk.js';

test('traverses a tree', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [{ type: 'A' }, { type: 'B' }, { type: 'C' }]
	};

	const state = {
		/** @type {string[]} */
		visited: [],
		depth: 0
	};

	walk(/** @type {import('./types').TestNode} */ (tree), state, {
		Root: (node, { state, next }) => {
			expect(node.type).toBe('Root');
			state.visited.push(state.depth + 'root');

			next({ ...state, depth: state.depth + 1 });
		},
		A: (node, { state }) => {
			expect(node.type).toBe('A');
			state.visited.push(state.depth + 'a');
		},
		B: (node, { state }) => {
			expect(node.type).toBe('B');
			state.visited.push(state.depth + 'b');
		},
		C: (node, { state }) => {
			expect(node.type).toBe('C');
			state.visited.push(state.depth + 'c');
		}
	});

	expect(state.visited).toEqual(['0root', '1a', '1b', '1c']);
});

test('visits all nodes with _', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [{ type: 'A' }, { type: 'B' }, { type: 'C' }]
	};

	let uid = 1;

	const state = {
		id: uid,
		depth: 0
	};

	/** @type {string[]} */
	const log = [];

	walk(/** @type {import('./types').TestNode} */ (tree), state, {
		_: (node, { state, next }) => {
			log.push(`${state.depth} ${state.id} enter ${node.type}`);
			next({ ...state, id: ++uid });
			log.push(`${state.depth} ${state.id} leave ${node.type}`);
		},
		Root: (node, { state, next }) => {
			log.push(`${state.depth} ${state.id} visit ${node.type}`);
			next({ ...state, depth: state.depth + 1 });
		},
		A: (node, { state }) => {
			log.push(`${state.depth} ${state.id} visit ${node.type}`);
		},
		B: (node, { state }) => {
			log.push(`${state.depth} ${state.id} visit ${node.type}`);
		},
		C: (node, { state }) => {
			log.push(`${state.depth} ${state.id} visit ${node.type}`);
		}
	});

	expect(log).toEqual([
		'0 1 enter Root',
		'0 2 visit Root',
		'1 2 enter A',
		'1 3 visit A',
		'1 2 leave A',
		'1 2 enter B',
		'1 4 visit B',
		'1 2 leave B',
		'1 2 enter C',
		'1 5 visit C',
		'1 2 leave C',
		'0 1 leave Root'
	]);
});

test('state is passed to children of specialized visitor when using universal visitor', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [{ type: 'A' }, { type: 'B' }, { type: 'C' }]
	};

	const state = {
		universal: false
	};

	/** @type {string[]} */
	const log = [];

	walk(/** @type {import('./types').TestNode} */ (tree), state, {
		_(node, { next }) {
			if (node.type === 'Root') {
				next({ universal: true });
			} else {
				next();
			}
		},
		Root(node, { state, visit }) {
			log.push(`visited ${node.type} ${state.universal}`);

			for (const child of node.children) {
				visit(child);
			}
		},
		A(node, { state, visit }) {
			log.push(`visited ${node.type} ${state.universal}`);
		},
		B(node, { state, visit }) {
			log.push(`visited ${node.type} ${state.universal}`);
		},
		C(node, { state, visit }) {
			log.push(`visited ${node.type} ${state.universal}`);
		}
	});

	expect(log).toEqual([
		'visited Root true',
		'visited A true',
		'visited B true',
		'visited C true'
	]);
});

test('path is pushed and popped correctly using next', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [
			{ type: 'Root', children: [{ type: 'A' }] },
			{ type: 'B' },
			{ type: 'C' }
		]
	};

	/** @type {string[]} */
	const log = [];

	/**
	 * @param {import('./types').TestNode} node
	 * @param {import('./types').TestNode[]} path
	 */
	function log_path(node, path) {
		log.push(`visited ${node.type} ${JSON.stringify(path.map((n) => n.type))}`);
	}

	walk(
		/** @type {import('./types').TestNode} */ (tree),
		{},
		{
			Root(node, { path, next }) {
				log_path(node, path);
				next();
			},
			A(node, { path }) {
				log_path(node, path);
			},
			B(node, { path }) {
				log_path(node, path);
			},
			C(node, { path }) {
				log_path(node, path);
			}
		}
	);

	expect(log).toEqual([
		'visited Root []',
		'visited Root ["Root"]',
		'visited A ["Root","Root"]',
		'visited B ["Root"]',
		'visited C ["Root"]'
	]);
});

test('path is pushed and popped correctly using visit', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [
			{ type: 'Root', children: [{ type: 'A' }] },
			{ type: 'B' },
			{ type: 'C' }
		]
	};

	/** @type {string[]} */
	const log = [];

	/**
	 * @param {import('./types').TestNode} node
	 * @param {import('./types').TestNode[]} path
	 */
	function log_path(node, path) {
		log.push(`visited ${node.type} ${JSON.stringify(path.map((n) => n.type))}`);
	}

	walk(
		/** @type {import('./types').TestNode} */ (tree),
		{},
		{
			Root(node, { path, visit }) {
				log_path(node, path);

				for (const child of node.children) {
					if (child.type !== 'C') {
						visit(child);
					}
				}
			},
			A(node, { path }) {
				log_path(node, path);
			},
			B(node, { path }) {
				log_path(node, path);
			},
			C(node, { path }) {
				log_path(node, path);
			}
		}
	);

	expect(log).toEqual([
		'visited Root []',
		'visited Root ["Root"]',
		'visited A ["Root","Root"]',
		'visited B ["Root"]'
	]);
});

// --- walk_readonly tests ---

test('walk_readonly traverses a tree', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [{ type: 'A' }, { type: 'B' }, { type: 'C' }]
	};

	const state = {
		/** @type {string[]} */
		visited: [],
		depth: 0
	};

	walk_readonly(/** @type {import('./types').TestNode} */ (tree), state, {
		Root: (node, { state, next }) => {
			expect(node.type).toBe('Root');
			state.visited.push(state.depth + 'root');

			next({ ...state, depth: state.depth + 1 });
		},
		A: (node, { state }) => {
			expect(node.type).toBe('A');
			state.visited.push(state.depth + 'a');
		},
		B: (node, { state }) => {
			expect(node.type).toBe('B');
			state.visited.push(state.depth + 'b');
		},
		C: (node, { state }) => {
			expect(node.type).toBe('C');
			state.visited.push(state.depth + 'c');
		}
	});

	expect(state.visited).toEqual(['0root', '1a', '1b', '1c']);
});

test('walk_readonly visits all nodes with _', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [{ type: 'A' }, { type: 'B' }, { type: 'C' }]
	};

	let uid = 1;

	const state = {
		id: uid,
		depth: 0
	};

	/** @type {string[]} */
	const log = [];

	walk_readonly(/** @type {import('./types').TestNode} */ (tree), state, {
		_: (node, { state, next }) => {
			log.push(`${state.depth} ${state.id} enter ${node.type}`);
			next({ ...state, id: ++uid });
			log.push(`${state.depth} ${state.id} leave ${node.type}`);
		},
		Root: (node, { state, next }) => {
			log.push(`${state.depth} ${state.id} visit ${node.type}`);
			next({ ...state, depth: state.depth + 1 });
		},
		A: (node, { state }) => {
			log.push(`${state.depth} ${state.id} visit ${node.type}`);
		},
		B: (node, { state }) => {
			log.push(`${state.depth} ${state.id} visit ${node.type}`);
		},
		C: (node, { state }) => {
			log.push(`${state.depth} ${state.id} visit ${node.type}`);
		}
	});

	expect(log).toEqual([
		'0 1 enter Root',
		'0 2 visit Root',
		'1 2 enter A',
		'1 3 visit A',
		'1 2 leave A',
		'1 2 enter B',
		'1 4 visit B',
		'1 2 leave B',
		'1 2 enter C',
		'1 5 visit C',
		'1 2 leave C',
		'0 1 leave Root'
	]);
});

test('walk_readonly state is passed to children of specialized visitor when using universal visitor', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [{ type: 'A' }, { type: 'B' }, { type: 'C' }]
	};

	const state = {
		universal: false
	};

	/** @type {string[]} */
	const log = [];

	walk_readonly(/** @type {import('./types').TestNode} */ (tree), state, {
		_(node, { next }) {
			if (node.type === 'Root') {
				next({ universal: true });
			} else {
				next();
			}
		},
		Root(node, { state, visit }) {
			log.push(`visited ${node.type} ${state.universal}`);

			for (const child of node.children) {
				visit(child);
			}
		},
		A(node, { state }) {
			log.push(`visited ${node.type} ${state.universal}`);
		},
		B(node, { state }) {
			log.push(`visited ${node.type} ${state.universal}`);
		},
		C(node, { state }) {
			log.push(`visited ${node.type} ${state.universal}`);
		}
	});

	expect(log).toEqual([
		'visited Root true',
		'visited A true',
		'visited B true',
		'visited C true'
	]);
});

test('walk_readonly path is correct using next', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [
			{ type: 'Root', children: [{ type: 'A' }] },
			{ type: 'B' },
			{ type: 'C' }
		]
	};

	/** @type {string[]} */
	const log = [];

	/**
	 * @param {import('./types').TestNode} node
	 * @param {import('./types').TestNode[]} path
	 */
	function log_path(node, path) {
		log.push(`visited ${node.type} ${JSON.stringify(path.map((n) => n.type))}`);
	}

	walk_readonly(
		/** @type {import('./types').TestNode} */ (tree),
		{},
		{
			Root(node, { path, next }) {
				log_path(node, path);
				next();
			},
			A(node, { path }) {
				log_path(node, path);
			},
			B(node, { path }) {
				log_path(node, path);
			},
			C(node, { path }) {
				log_path(node, path);
			}
		}
	);

	expect(log).toEqual([
		'visited Root []',
		'visited Root ["Root"]',
		'visited A ["Root","Root"]',
		'visited B ["Root"]',
		'visited C ["Root"]'
	]);
});

test('walk_readonly path is correct using visit', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [
			{ type: 'Root', children: [{ type: 'A' }] },
			{ type: 'B' },
			{ type: 'C' }
		]
	};

	/** @type {string[]} */
	const log = [];

	/**
	 * @param {import('./types').TestNode} node
	 * @param {import('./types').TestNode[]} path
	 */
	function log_path(node, path) {
		log.push(`visited ${node.type} ${JSON.stringify(path.map((n) => n.type))}`);
	}

	walk_readonly(
		/** @type {import('./types').TestNode} */ (tree),
		{},
		{
			Root(node, { path, visit }) {
				log_path(node, path);

				for (const child of node.children) {
					if (child.type !== 'C') {
						visit(child);
					}
				}
			},
			A(node, { path }) {
				log_path(node, path);
			},
			B(node, { path }) {
				log_path(node, path);
			},
			C(node, { path }) {
				log_path(node, path);
			}
		}
	);

	expect(log).toEqual([
		'visited Root []',
		'visited Root ["Root"]',
		'visited A ["Root","Root"]',
		'visited B ["Root"]'
	]);
});

test('walk_readonly stop halts traversal', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [{ type: 'A' }, { type: 'B' }, { type: 'C' }]
	};

	/** @type {string[]} */
	const visited = [];

	walk_readonly(/** @type {import('./types').TestNode} */ (tree), null, {
		_(node, { next, stop }) {
			visited.push(node.type);
			if (node.type === 'B') {
				stop();
				return;
			}
			next();
		}
	});

	expect(visited).toEqual(['Root', 'A', 'B']);
});
