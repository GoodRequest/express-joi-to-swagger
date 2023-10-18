import { Request, Response, NextFunction } from 'express'

// eslint-disable-next-line import/prefer-default-export
export const permissionMiddleware = (allowPermissions: string[]) =>
	function permission(_req: Request, _res: Response, next: NextFunction) {
		// NOTE: permission logic ...
		// eslint-disable-next-line no-console
		console.log(allowPermissions)

		return next()
	}
