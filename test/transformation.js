import { expect, test } from 'vitest';
import { walk } from '../src/walk.js';

test('transforms a tree', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [{ type: 'A' }, { type: 'B' }, { type: 'C' }]
	};

	let count = 0;

	const transformed = /** @type {import('./types').TransformedRoot} */ (
		walk(/** @type {import('./types').TestNode} */ (tree), null, {
			Root: (node, { visit }) => {
				return {
					type: 'TransformedRoot',
					elements: node.children.map((child) => visit(child))
				};
			},
			A: (node) => {
				count += 1;
				return {
					type: 'TransformedA'
				};
			},
			C: (node) => {
				count += 1;
				return {
					type: 'TransformedC'
				};
			}
		})
	);

	expect(count).toBe(2);

	// check that `tree` wasn't mutated
	expect(tree).toEqual({
		type: 'Root',
		children: [{ type: 'A' }, { type: 'B' }, { type: 'C' }]
	});

	expect(transformed).toEqual({
		type: 'TransformedRoot',
		elements: [
			{ type: 'TransformedA' },
			{ type: 'B' },
			{ type: 'TransformedC' }
		]
	});

	// expect the `B` node to have been preserved
	expect(transformed.elements[1]).toBe(tree.children[1]);
});

test('respects individual visitors if universal visitor calls next()', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [{ type: 'A' }, { type: 'B' }, { type: 'C' }]
	};

	const transformed = walk(
		/** @type {import('./types').TestNode} */ (tree),
		null,
		{
			_(node, { state, next }) {
				next(state);
			},
			A(node) {
				return {
					type: 'TransformedA'
				};
			}
		}
	);

	expect(transformed).toEqual({
		type: 'Root',
		children: [{ type: 'TransformedA' }, { type: 'B' }, { type: 'C' }]
	});
});

test('returns the result of child transforms when calling next', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [{ type: 'A' }, { type: 'B' }, { type: 'C' }]
	};

	let count = 0;
	let children;

	const transformed = /** @type {import('./types').TestNode} */ (
		walk(/** @type {import('./types').TestNode} */ (tree), null, {
			Root: (node, { next }) => {
				const result = /** @type {import('./types').Root} */ (next());
				children = result.children;
				return node;
			},
			A: (node) => {
				count += 1;
				return {
					type: 'TransformedA'
				};
			},
			C: (node) => {
				count += 1;
				return {
					type: 'TransformedC'
				};
			}
		})
	);

	expect(count).toBe(2);

	// check that `tree` wasn't mutated
	expect(tree).toEqual({
		type: 'Root',
		children: [{ type: 'A' }, { type: 'B' }, { type: 'C' }]
	});

	expect(transformed).toBe(tree);

	expect(children).toEqual([
		{ type: 'TransformedA' },
		{ type: 'B' },
		{ type: 'TransformedC' }
	]);
});

test('returns undefined if there are no child transformations', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [{ type: 'A' }, { type: 'B' }, { type: 'C' }]
	};

	let result;

	const transformed = /** @type {import('./types').TestNode} */ (
		walk(/** @type {import('./types').TestNode} */ (tree), null, {
			Root: (node, { next }) => {
				result = next();
			}
		})
	);

	expect(transformed).toBe(tree);

	expect(result).toBe(undefined);
});

test('clones a parent once when a child is transformed via next()', () => {
	/** @type {import('./types').TestNode} */
	const tree = {
		type: 'Root',
		children: [{ type: 'A' }, { type: 'B' }]
	};

	let from_next;

	const transformed = walk(
		/** @type {import('./types').TestNode} */ (tree),
		null,
		{
			Root: (node, { next }) => {
				from_next = next();
			},
			A: () => {
				return {
					type: 'TransformedA'
				};
			}
		}
	);

	expect(from_next).toEqual({
		type: 'Root',
		children: [{ type: 'TransformedA' }, { type: 'B' }]
	});

	// the clone returned from `next()` is reused rather than cloning the parent again
	expect(transformed).toBe(from_next);
});

test('doesnt mutate tree with non-type objects', () => {
	const tree = {
		type: 'Root',
		children: [{ type: 'A', metadata: { foo: true } }, { type: 'B' }]
	};

	const transformed = walk(tree, null, {});

	expect(transformed).toBe(tree);
});
