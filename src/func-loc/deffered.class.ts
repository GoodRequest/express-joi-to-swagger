// eslint-disable-next-line
export class Deferred<T> {
	public readonly promise: Promise<T>
	public reject: (err: Error) => void
	public resolve: (result: T) => void

	constructor() {
		this.promise = new Promise<T>((resolve, reject) => {
			this.reject = reject
			this.resolve = resolve
		})
	}
}
