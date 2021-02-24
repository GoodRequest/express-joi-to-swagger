// eslint-disable-next-line import/no-extraneous-dependencies
import { Request, Response, NextFunction } from 'express'

// eslint-disable-next-line import/prefer-default-export
export const permissionMiddleware = (allowPermissions: string[]) => function permission(req: Request, res: Response, next: NextFunction) {
	// NOTE: TODO permission logic
	console.log(allowPermissions)
	return next()
}
