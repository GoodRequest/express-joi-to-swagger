import React from 'react'

export default class Modal extends React.Component {
	render() {
		const { visible } = this.props
		return <div style={{ position: 'absolute', border: '1px solid red', left: '6%' top: '6%' width: '88%', height: '88%', overflow: 'auto' display: visible ? 'block' : 'none' }}>Text</div>
	}
}
