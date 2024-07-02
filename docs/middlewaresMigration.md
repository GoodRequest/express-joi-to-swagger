# Migrating from parsers to middlewares

Second version supports much wider spector of middlewares which still simply
config definition and easy further formatting. To use those benefits
the middleware should be a named HOF (Higher Order Function) with at least 
one attribute otherwise the middleware will be considered as an unrecognised.

The only one thing that is necessary to do is to update express-joi-to-swagger configuration like in the example where main changes are:

- `groupName` so as `paramName` are not necessary anymore as extractor function will receive the copy of values passed into the middleware.
Max depth of values if 5 otherwise null will be returned
- `formatter` is a replacement for `permissionsDescriptionFormatter` what is now middleware specific
- `basicArrayFormatter()` was created to support the return type of old default formatter return type. Can be imported like `import { basicArrayFormatter } from "express-joi-to-swagger/src/utils/extractors";`

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
		formatter: basicArrayFormatter
	}
]
```
