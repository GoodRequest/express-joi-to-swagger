# Migrating from parsers to middlewares

Second version supports much wider spector of middlewares which still simply
config definition and easy further formatting. To use those benefits
the middleware should be a named HOF (Higher Order Function) with at least 
one attribute otherwise the middleware will be considered as an unrecognised.

The only one thing that is necessary to do is to update express-joi-to-swagger configuration like in the example where main changes are:

- `groupName` is not necessary anymore as extractor function will receive the copy of values passed into the middleware
- `middlewareArguments` is used instead of paramName what makes possible to define several arguments at once
- `extractor` is a replacement for `permissionsDescriptionFormatter` what is now middleware specific
- `firstVersionExtractor` was created to support the return type of old default formatter return type. Can be imported like `import { firstVersionExtractor } from "express-joi-to-swagger/src/utils/extractors";`

```typescript
// Old configuration
permissions: [
	{
		closure: 'permissionMiddleware',
		middlewareName: 'permission',
		paramName: 'options',
		groupName: 'admin'
	},
	{
		closure: 'permissionMiddleware',
		middlewareName: 'permission',
		paramName: 'options',
		groupName: 'user'
	}
]
```

```typescript
// New configuration
middlewares: [
	{
		closure: 'permissionMiddleware',
		middlewareName: 'permission',
		middlewareArguments: ['options'],
		extractor: firstVersionExtractor
	}
]
```
