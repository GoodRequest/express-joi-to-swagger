import { Request, Response, NextFunction } from 'express'

function permissionMiddleware(options: {
	admin?: {
		allowedPermissions: string[]
	}
	user?: {
		allowedPermissions: string[]
		entity?: string
	}
	ownPermission?: boolean
	ownParam?: string
}) {
	return function permission(_req: Request, _res: Response, next: NextFunction) {
		// NOTE: permission logic ...
		// eslint-disable-next-line no-console
		console.log(options)

		return next()
	}
}

export default permissionMiddleware
