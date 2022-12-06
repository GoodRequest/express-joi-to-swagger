import React, { cloneElement } from 'react'
import Select, { Option } from 'rc-select'
import Modal from './Modal'
import 'rc-select/assets/index.css'

const parseSearch = () => {
	const map = {}
	const { search } = win.location

	if (!search) return {}

	if (search != '') {
		const params = search.substr(1).split('&')

		for (let i in params) {
			if (!Object.prototype.hasOwnProperty.call(params, i)) {
				continue
			}
			i = params[i].split('=')
			map[decodeURIComponent(i[0])] = (i[1] && decodeURIComponent(i[1])) || ''
		}
	}

	return map
}

export const serializeSearch = (searchMap) => {
	return Object.keys(searchMap)
		.map((k) => {
			return `${encodeURIComponent(k)}=${encodeURIComponent(searchMap[k])}`
		})
		.join('&')
}

export default class Topbar extends React.Component {
	constructor(props, context) {
		super(props, context)
		this.state = { url: props.specSelectors.url(), selectedIndex: 0, visible: false }
	}

	UNSAFE_componentWillReceiveProps(nextProps) {
		this.setState({ url: nextProps.specSelectors.url() })
	}

	onUrlChange = (e) => {
		const {
			target: { value }
		} = e
		this.setState({ url: value })
	}

	flushAuthData() {
		const { persistAuthorization } = this.props.getConfigs()
		if (persistAuthorization) {
			return
		}
		this.props.authActions.restoreAuthorization({
			authorized: {}
		})
	}

	loadSpec = (url) => {
		this.flushAuthData()
		this.props.specActions.updateUrl(url)
		this.props.specActions.download(url)
	}

	onUrlSelect = (e) => {
		const url = e.target.value || e.target.href
		this.loadSpec(url)
		this.setSelectedUrl(url)
		e.preventDefault()
	}

	downloadUrl = (e) => {
		this.loadSpec(this.state.url)
		e.preventDefault()
	}

	setSearch = (spec) => {
		const search = parseSearch()
		search['urls.primaryName'] = spec.name
		const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`
		if (window && window.history && window.history.pushState) {
			window.history.replaceState(null, '', `${newUrl}?${serializeSearch(search)}`)
		}
	}

	setSelectedUrl = (selectedUrl) => {
		const configs = this.props.getConfigs()
		const urls = configs.urls || []

		if (urls && urls.length) {
			if (selectedUrl) {
				urls.forEach((spec, i) => {
					if (spec.url === selectedUrl) {
						this.setState({ selectedIndex: i })
						this.setSearch(spec)
					}
				})
			}
		}
	}

	componentDidMount() {
		const configs = this.props.getConfigs()
		const urls = configs.urls || []

		if (urls && urls.length) {
			let targetIndex = this.state.selectedIndex
			const primaryName = configs['urls.primaryName']
			if (primaryName) {
				urls.forEach((spec, i) => {
					if (spec.name === primaryName) {
						this.setState({ selectedIndex: i })
						targetIndex = i
					}
				})
			}

			this.loadSpec(urls[targetIndex].url)
		}
	}

	onFilterChange = (e) => {
		const {
			target: { value }
		} = e
		this.props.layoutActions.updateFilter(value)
	}

	onClickDiff = (e, link) => {
		console.log(e, link)
		this.setState({
			visible: true
		})
	}

	onModalClose = () => {
		this.setState({
			visible: false
		})
	}

	render() {
		const { getComponent, specSelectors, getConfigs } = this.props
		const Button = getComponent('Button')
		const Link = getComponent('Link')
		const Logo = getComponent('Logo')

		const isLoading = specSelectors.loadingStatus() === 'loading'
		const isFailed = specSelectors.loadingStatus() === 'failed'

		const classNames = ['download-url-input']
		if (isFailed) classNames.push('failed')
		if (isLoading) classNames.push('loading')

		const { urls } = getConfigs()
		const control = []
		let formOnSubmit = null

		if (urls) {
			const rows = []
			urls.forEach((link, i) => {
				rows.push(
					<Option key={i} value={link.url} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<span>{link.name}</span>
						{/* wrapping button in span with .swagger-ui so the styles for .btn and .try-out__btn classes work */}
						<span className='swagger-ui'>
							<button onClick={(e) => this.onClickDiff(e, link)} className='btn try-out__btn' style={{ background: 'white' }}>
								diff
							</button>
						</span>
					</Option>
				)
			})

			control.push(
				<label className='select-label' htmlFor='select'>
					<span>Select api definition</span>
					<Select style={{ width: '33%' }} id='select' disabled={isLoading} onChange={this.onUrlSelect} value={urls[this.state.selectedIndex].url}>
						{rows}
					</Select>
				</label>
			)
		} else {
			formOnSubmit = this.downloadUrl
			control.push(<input className={classNames.join(' ')} type='text' onChange={this.onUrlChange} value={this.state.url} disabled={isLoading} />)
			control.push(
				<Button className='download-url-button' onClick={this.downloadUrl}>
					Explore
				</Button>
			)
		}

		return (
			<div className='topbar'>
				<div className='wrapper'>
					<div className='topbar-wrapper'>
						<Link>
							<Logo />
						</Link>
						<form className='download-url-wrapper' onSubmit={formOnSubmit}>
							{control.map((el, i) => cloneElement(el, { key: i }))}
						</form>
					</div>
				</div>
				<Modal visible={this.state.visible} onClose={() => this.onModalClose()} options={['v0.0.1', 'v0.0.2', 'v0.0.3']} />
			</div>
		)
	}
}
