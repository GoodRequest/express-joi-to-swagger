import { Request, Response, NextFunction } from 'express'

function permissionMiddleware(
	options:
		| {
				admin?: {
					allowedPermissions: string[]
				}
				user?: {
					allowedPermissions: string[]
					entity?: string
				}
				ownPermission?: boolean
				ownParam?: string
		  }
		| string[]
) {
	return function permission(_req: Request, _res: Response, next: NextFunction) {
		// NOTE: console.log(options) is here, so middleware and its params can be found by debugger when parsing endpoints
		// eslint-disable-next-line no-console
		console.log(options)

		return next()
	}
}

export default permissionMiddleware
