# Migrating from permissions to middlewares

In the second version, permissions were replaced by middlewares, which supports
a much wider spectrum of middlewares. The base middleware parsing logic 
(parsing of permissions) from v1 remained unchanged,so the middleware must 
be named HOF (Higher Order Function) with at least one parameter, otherwise 
the middleware will not be recognized.

The only thing necessary to do is to update express-joi-to-swagger configuration, where main changes are:

- `groupName` and `paramName` options were removed, format function will receive all parameters of middleware in form of an object
- `maxParamDepth` option was added to limit depth of parsed parameter of middleware. Default value is 5. If depth of parsed parameter is exceeded, null will be returned
- `formatter` is a replacement for `permissionsDescriptionFormatter` and now it is middleware 
specific, i.e. formatter per middleware. If formatter is not provided, defaultFormatter will 
be used and it will return string in format` ${middlewareName}: ${isUsed}`, e.g. `permission: true`
- `basicArrayFormatter()` was created to support behavior of old default formatter. It can be imported 
like this: `import { basicArrayFormatter } from "express-joi-to-swagger/src/utils/extractors";`

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
