/** @import { Context, Visitor, Visitors } from './types.js' */

/**
 * @template {{ type: string }} T
 * @template {Record<string, any> | null} U
 * @param {T} node
 * @param {U} state
 * @param {Visitors<T, U>} visitors
 */
export function walk(node, state, visitors) {
	const universal = visitors._;

	let stopped = false;

	/**
	 * @param {T} node
	 * @param {T[]} path
	 * @param {U} state
	 * @returns {T | undefined}
	 */
	function visit(node, path, state) {
		// Don't return the node here or it could lead to false-positive mutation detection
		if (stopped) return;
		if (!node.type) return;

		/** @type {T | void} */
		let result;

		/** @type {Record<string, any> | null} lazily initialized for performance reasons */
		let mutations = null;

		const next = (next_state = state) => {
			path.push(node);
			for (const key in node) {
				if (key === 'type') continue;

				const child_node = node[key];
				if (child_node && typeof child_node === 'object') {
					if (Array.isArray(child_node)) {
						/** @type {Record<number, T> | null} lazily initialized for performance reasons */
						let array_mutations = null;
						const len = child_node.length;

						for (let i = 0; i < len; i++) {
							const node = child_node[i];
							if (node && typeof node === 'object') {
								const result = visit(node, path, next_state);
								if (result) {
									(array_mutations ??= {})[i] = result;
								}
							}
						}

						if (array_mutations) {
							(mutations ??= {})[key] = child_node.map(
								(node, i) => array_mutations[i] ?? node
							);
						}
					} else {
						const result = visit(
							/** @type {T} */ (child_node),
							path,
							next_state
						);

						// @ts-ignore
						if (result) {
							(mutations ??= {})[key] = result;
						}
					}
				}
			}
			path.pop();

			if (mutations) {
				return apply_mutations(node, mutations);
			}
		};
		const stop = () => {
			stopped = true;
		};
		/** @type {Context<T, U>['visit']} */
		const visit_node = (next_node, next_state = state) => {
			path.push(node);
			const result = visit(next_node, path, next_state) ?? next_node;
			path.pop();
			return result;
		};

		const visitor = /** @type {Visitor<T, U, T> | undefined} */ (
			visitors[/** @type {T['type']} */ (node.type)]
		);

		if (universal) {
			/** @type {T | void} */
			let inner_result;

			result = universal(node, {
				// Don't spread for performance reasons
				path,
				state,
				/** @param {U} next_state */
				next: (next_state = state) => {
					state = next_state; // make it the default for subsequent specialised visitors

					inner_result = visitor
						? visitor(node, {
								path,
								state: next_state,
								next,
								stop,
								visit: visit_node
							})
						: next(next_state);

					return inner_result;
				},
				stop,
				visit: visit_node
			});

			// @ts-expect-error TypeScript doesn't understand that `context.next(...)` is called immediately
			if (!result && inner_result) {
				result = inner_result;
			}
		} else {
			result = visitor
				? visitor(node, { path, state, next, stop, visit: visit_node })
				: next();
		}

		if (!result && mutations) {
			result = apply_mutations(node, mutations);
		}

		if (result) {
			return result;
		}
	}

	return visit(node, [], state) ?? node;
}

/**
 * @template {Record<string, any>} T
 * @param {T} node
 * @param {Record<string, any>} mutations
 * @returns {T}
 */
function apply_mutations(node, mutations) {
	/** @type {Record<string, any>} */
	const obj = {};

	const descriptors = Object.getOwnPropertyDescriptors(node);

	for (const key in descriptors) {
		Object.defineProperty(obj, key, descriptors[key]);
	}

	for (const key in mutations) {
		obj[key] = mutations[key];
	}

	return /** @type {T} */ (obj);
}
