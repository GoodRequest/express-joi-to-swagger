import Select, { Option } from 'rc-select'
import { valueType } from 'rc-select/lib/PropTypes'
import React from 'react'
import CompareDiagramIcon from './CompareDiagramIcon'

type Props = {
	visible: boolean
	onClose: () => void
	options: string[]
}

type State = {
	destroy: boolean | number
	compareFrom: string | null
	compareTo: string | null
	resultVisible: boolean
}

export default class Modal extends React.Component<Props, State> {
	state: State = {
		destroy: false,
		compareFrom: this.props.options[0],
		compareTo: this.props.options[0],
		resultVisible: false
	}

	onChange = (value: valueType, inputId: string) => {
		this.setState((prevState) => ({ ...prevState, [inputId]: value }))
	}

	onDestroy = () => {
		this.setState({
			destroy: 1
		})
	}

	onModalClick = (e: any) => {
		if (e.target.classList.contains('modal')) {
			this.props.onClose()
		}
	}

	onCompareClick = () => {
		this.setState({
			resultVisible: true
		})
	}

	render() {
		const { visible, onClose, options } = this.props
		const selectCommonProps = {
			autoFocus: true,
			showSearch: true,
			optionFilterProp: 'text',
			style: { width: '100%' }
		}

		return (
			<div id='myModal' className={`modal ${visible ? 'modal-visible' : ''}`} onClick={this.onModalClick}>
				<div className='modal-content'>
					<button className='btn try-out__btn modal-close-btn' onClick={onClose}>
						&times;
					</button>
					<div className='row'>
						<div className='compare-diagram-icon-wrapper'>
							<CompareDiagramIcon />
						</div>
						<div className='inputs-wrapper'>
							<Select
								id='my-select-1'
								value={this.state.compareFrom}
								placeholder='placeholder'
								onChange={(value) => this.onChange(value, 'compareFrom')}
								{...selectCommonProps}
							>
								{options.map((option) => (
									<Option key={option} value={option} text={option}>
										{option}
									</Option>
								))}
							</Select>
							<Select
								id='my-select-2'
								value={this.state.compareTo}
								placeholder='placeholder'
								onChange={(value) => this.onChange(value, 'compareTo')}
								{...selectCommonProps}
							>
								{options.map((option) => (
									<Option key={option} value={option} text={option}>
										{option}
									</Option>
								))}
							</Select>
							<div style={{ marginTop: '20px' }}>
								<button type='button' className='btn execute' style={{ padding: '8px 40px', width: '100%' }} onClick={this.onCompareClick}>
									Compare
								</button>
							</div>
						</div>
					</div>
					{this.state.resultVisible && (
						<div className='result'>
							Lorem ipsum dolor sit amet consectetur adipisicing elit. Molestiae neque culpa provident accusamus explicabo repudiandae esse eveniet at, quo fugit et
							unde ullam odit dolor, iusto porro asperiores! Sunt porro ipsa odit et. Nisi omnis vel cupiditate consequatur nihil corporis nobis. Optio itaque
							voluptatum ut, id nam nulla aliquid? Porro quae officia saepe ratione dignissimos optio ullam excepturi, repellendus nostrum ipsum quisquam alias
							molestiae quo impedit ducimus, iure tempore velit minima recusandae voluptatem iusto labore dolorum. Perferendis illum blanditiis a nemo ex qui nam,
							animi hic? Eius, voluptatem expedita. Adipisci dolorum quod sunt dicta placeat vel quasi debitis fugit ullam alias temporibus illo quos reprehenderit,
							itaque corporis omnis. Officia, dolorum? Excepturi, consectetur minus. Labore, atque enim! Rerum totam assumenda pariatur praesentium labore itaque cum
							officiis minima sit voluptatibus, eaque autem quod obcaecati accusamus illum nam incidunt tempore cumque. Debitis, facilis enim consequatur deserunt
							doloremque commodi similique, praesentium laboriosam, quas aut dolores reiciendis officia ea harum tempora aliquid atque minus. Quae, id veniam impedit
							deleniti quasi delectus dolore sed repellendus debitis aut quo illum quis hic illo pariatur cum, iusto quibusdam rem corporis quas ut. Cumque, sint
							pariatur minima praesentium accusamus consectetur, porro nisi est veritatis ducimus, animi excepturi non doloribus dolore facilis vel iure ab ipsa.
							Magni molestias quia provident sint odit repellat pariatur excepturi voluptatem, cum vero exercitationem, culpa saepe vitae. Eveniet labore libero eaque
							dolorem praesentium sapiente ex facilis nostrum excepturi quam aspernatur quibusdam, illum illo, amet iusto aliquam, nisi laborum! Corporis assumenda
							maiores, voluptatem labore reiciendis quaerat. Accusantium pariatur autem saepe voluptas possimus nesciunt repudiandae eum error veniam ratione quidem
							neque sapiente odit fugiat, expedita quam suscipit tempore dolor quasi dolorem sint. Lorem ipsum dolor sit amet consectetur adipisicing elit. Aut,
							soluta atque. Harum velit dolores, minus sapiente cupiditate rem labore repellendus aspernatur natus odio commodi. Ipsam, eum corrupti. Corporis eius
							aliquid ipsa cumque nobis eos odit aspernatur repellendus doloribus repudiandae quae voluptas cupiditate, adipisci ratione! Laborum fugiat incidunt,
							rerum vel eius facilis suscipit obcaecati perspiciatis iste placeat numquam consequatur, facere voluptatum, earum amet corporis sequi. Iure tempora
							cupiditate voluptates voluptas consequatur, harum ducimus delectus fugiat ipsam. In quisquam ratione quibusdam animi dolor sapiente veniam, ullam
							ducimus, delectus ipsum facilis rem, perspiciatis repellendus itaque. Amet nisi saepe, dolores impedit voluptates magnam? Sed aspernatur, aliquam, illum
							reiciendis eum sunt voluptate natus quisquam sequi ratione doloribus laboriosam repudiandae! Culpa ipsam esse unde explicabo reprehenderit tempora ab
							velit nihil ea optio! Porro expedita maiores dignissimos quasi nam, doloremque dolor provident cupiditate incidunt nihil explicabo tenetur commodi rerum
							id nulla aliquam harum odit magnam reprehenderit soluta praesentium? Minima ullam error aspernatur sit, alias magni deleniti ea quis reprehenderit, quam
							quas esse nesciunt itaque dignissimos quod facere. Vel dolore quibusdam ut sequi, quaerat nulla ex, doloremque expedita culpa sint deleniti quidem,
							veritatis doloribus ratione vitae. Laboriosam accusantium perferendis impedit, adipisci consequuntur temporibus modi hic debitis id fugit corrupti omnis
							veritatis quisquam sequi nobis alias. Consectetur eos dolorem quod. Nihil ratione eius excepturi esse vitae soluta harum vel ullam aut sed nobis
							suscipit accusantium itaque vero reiciendis enim voluptatum odit, ex neque laboriosam provident! Nisi cupiditate atque, officiis debitis necessitatibus
							tenetur possimus sequi impedit, minima, autem error itaque odio laboriosam dicta soluta. Distinctio sunt eveniet sequi quaerat in pariatur ab facere,
							eaque aperiam nesciunt fugit tempora eligendi laboriosam neque possimus reprehenderit iste officia! Adipisci eveniet laborum quam incidunt eius
							delectus, facilis tenetur temporibus repudiandae necessitatibus quaerat consectetur nostrum reiciendis libero soluta sequi, suscipit reprehenderit
							provident non laboriosam sit illum ea voluptate? Eum rem totam delectus eos maiores autem ea eveniet, fugit similique voluptatibus neque voluptates enim
							vitae recusandae corporis fuga quas voluptate incidunt! Doloremque, et esse itaque eius repellendus quas ad nemo accusantium qui debitis eveniet
							voluptate aliquam neque quam voluptatum, voluptates inventore explicabo incidunt reiciendis nihil dolore ex cum soluta autem. Placeat necessitatibus
							excepturi assumenda cupiditate velit sunt beatae? Ducimus cumque, mollitia cum nesciunt incidunt aliquam dolor odio eligendi quo ea aperiam. Ullam
							similique eveniet, facilis veniam repellat delectus soluta exercitationem dolore harum corrupti numquam rem et, tempora aperiam temporibus maiores
							voluptas. Velit deleniti corrupti id perferendis nihil. Numquam ducimus sit explicabo rerum perferendis quod maiores, iusto aperiam facere alias dolor
							in atque temporibus eligendi, laudantium nesciunt, molestiae quos quaerat impedit soluta adipisci itaque quam sunt quae. Consectetur quis accusamus
							omnis quam tempore, dolorem maiores, ducimus, voluptas ipsa deserunt reprehenderit harum veritatis ex. Hic inventore minus sequi magni. Rerum non
							necessitatibus illum eveniet ad nam minima suscipit temporibus commodi enim porro explicabo nulla aperiam quia veniam dicta, optio unde veritatis
							ratione distinctio adipisci ipsam. Cum quia natus atque fugit suscipit expedita nisi ab architecto error nihil iste, autem modi ipsum! Reprehenderit
							dolorum temporibus quo facere consequuntur earum veritatis in tenetur, labore porro cumque vel ratione sed quisquam assumenda? Ex accusamus temporibus
							impedit recusandae, deleniti quidem in id quia, aliquam atque, totam facere ipsum dolor. Repellendus, doloremque voluptate pariatur culpa sit
							exercitationem in quam cupiditate quaerat quia dolorum tempora maiores reiciendis consequatur, eligendi eos? Voluptatem natus consectetur temporibus
							voluptas dolores vitae quos, laboriosam, autem recusandae, sunt ullam. Vitae temporibus deserunt hic aliquam alias necessitatibus a eveniet sapiente eum
							odit iure debitis, adipisci ex. Consequuntur a ipsam dicta neque assumenda rem necessitatibus aliquid ex reiciendis porro? Ut excepturi, voluptate
							perferendis harum quasi laborum sequi maxime. Deserunt, enim cum molestias accusamus expedita ex in totam exercitationem ducimus ipsa quam commodi
							inventore odio! Rem tempora hic ut numquam nulla, repudiandae perferendis necessitatibus deserunt voluptas labore ipsam illo aut, veritatis incidunt
							delectus aliquid facere? Soluta quas pariatur, distinctio officiis veritatis nam rerum. Quidem, iusto neque. Et, atque. Itaque vel expedita earum rerum
							quisquam rem autem, illum facilis praesentium, molestias aut. Quo rem, ipsa repudiandae dolores unde ullam! Illum sit quis reiciendis cupiditate, iusto
							ducimus suscipit cumque sapiente distinctio a expedita unde placeat. Possimus aspernatur necessitatibus autem beatae est consectetur sapiente neque fuga
							in explicabo adipisci eius facilis, quod nobis esse voluptatibus magnam blanditiis corporis vero sit quis repudiandae! Aspernatur aperiam enim nostrum.
							Illo hic labore temporibus repellat nobis aspernatur voluptas? Alias sequi ipsum, atque corporis molestiae totam quae delectus aperiam consequuntur!
							Enim tenetur maiores, voluptatem corporis qui dolor eligendi aliquid, in illo et, nostrum modi est nihil voluptas esse porro libero necessitatibus
							consequuntur. Quisquam non iusto nulla asperiores illo, beatae delectus distinctio totam maxime ipsam voluptatum, rem consequatur optio veritatis
							eveniet dolorem necessitatibus nam sequi nihil. Ut dolor, assumenda eveniet expedita quas necessitatibus accusamus architecto impedit, eligendi, hic
							numquam eaque in id nobis rem harum blanditiis repellendus ex enim quasi iure. Fugit soluta ipsa sint corporis consectetur minima! Porro, esse. Nulla
							eligendi asperiores ipsa sapiente neque voluptatem repellendus autem placeat quo adipisci magni, similique qui vero dolor quas rem accusantium suscipit
							dolorum error ab. Dolor perferendis incidunt tempora fugit laborum explicabo aliquid cumque nobis optio, possimus quisquam totam quaerat quibusdam,
							ullam rem ipsum deserunt fugiat harum. Ullam nemo earum in mollitia illum error ut quaerat quis veritatis quam, provident aut officia eius illo dolorum
							dicta doloribus. Provident debitis dolor qui illum beatae maxime doloribus dolorem dolore rerum inventore numquam, animi esse aperiam magnam eius eum
							dolorum maiores ad consequuntur saepe voluptates magni sequi voluptate! Deleniti, voluptatum quos deserunt unde recusandae sequi rem blanditiis
							repellendus tempora, placeat et esse tenetur vero dignissimos velit error nulla iusto ullam. Nulla impedit possimus sapiente quam qui dicta aspernatur
							doloremque vel modi illo beatae tempora similique, sequi fugit vero excepturi laboriosam eius est magni a voluptate suscipit molestiae? Maxime modi
							minima, provident sapiente accusamus fugit nisi, odit officiis dicta odio distinctio repellendus vel magni? Dignissimos soluta molestias ducimus
							numquam, odit facere ab temporibus similique aperiam harum dolor facilis rerum mollitia itaque labore officia exercitationem necessitatibus sequi
							aliquam distinctio ex voluptatem sit dolore laboriosam. Sint cum aliquid eum?
						</div>
					)}
				</div>
			</div>
		)
	}
}
