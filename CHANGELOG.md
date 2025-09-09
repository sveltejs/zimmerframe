# zimmerframe changelog

## 1.1.3

### Patch Changes

- 9c17204: fix: update `pkg.repository`

## 1.1.2

- Keep non-enumerable properties non-enumerable ([#20](https://github.com/Rich-Harris/zimmerframe/pull/20))

## 1.1.1

- Prevent false positive mutations ([#18](https://github.com/Rich-Harris/zimmerframe/pull/18))
- Keep non-enumerable properties when cloning nodes ([#19](https://github.com/Rich-Harris/zimmerframe/pull/19))

## 1.1.0

- Return transformed node from `context.next()` ([#17](https://github.com/Rich-Harris/zimmerframe/pull/17))

## 1.0.0

- Stable release

## 0.2.1

- Push current node to path when calling `visit`

## 0.2.0

- Require `next()` to be called to visit children

## 0.1.2

- Forward state from universal visitors

## 0.1.1

- Skip children after calling `visit`

## 0.1.0

- Rename `context.transform` to `context.visit`

## 0.0.11

- Respect individual visitor transformations if universal visitors calls `next(...)`

## 0.0.10

- Simplify `Context` type arguments

## 0.0.9

- Skip children when transforming

## 0.0.8

- Fix `path` type

## 0.0.7

- Fix package.json

## 0.0.6

- Export types

## 0.0.5

- Fix some type issues

## 0.0.4

- Make visitor signature more forgiving

## 0.0.3

- Allow state to be `null`

## 0.0.2

- Add `pkg.files`

## 0.0.1

- First release
