import React from 'react';
import { connect } from 'react-redux';
import { setUserName } from '../redux/application/actions';

const directions = {
	LEFT: 37,
	TOP: 38,
	RIGHT: 39,
	BOTTOM: 40,
};

const cell = 15;
const rect = cell;
const lineWidth = 1;

class Raf {
	constructor() {
		this.time = new Date().getTime();
		this.frame = 0;
		this.fps = 1000 / 50;
		this.isAnimating = false;
	}

	updateStart() {
		if (this.isAnimating) return;
		this.startTime = new Date().getTime();
		this.isAnimating = true;
	}

	shouldUpdate(time = new Date().getTime()) {
		if (!this.isAnimating) return true;

		const result = time - this.startTime > this.fps;
		if (result) {
			this.updateFrame();
		}
		return result;
	}

	updateFrame() {
		this.startTime = 0;
		this.isAnimating = false;
		this.frame++;
	}
}

class Home extends React.Component {

	constructor(props) {
		super(props);

		this.defaultDx = cell;
		this.defaultDy = cell;


		this.x = parseInt(5 * cell + Math.random() * 1000);
		this.y = parseInt(5 * cell + Math.random() * 500);
		this.dx = cell;
		this.dy = 0;
		this.height = 600;
		this.width = 1200;
		this.points = [{
			x: this.x,
			y: this.y,
		}];
		this.state = {
			direction: Math.random() > 0.5 ? directions.RIGHT : directions.LEFT,
		};
		this.endGame = false;
		this.state = {
			userId: 0,
			users: [
			],
		}
	}

	componentDidMount() {
		this.props.socket.on('ping', (pong) => console.log(pong))

		this.props.socket.on('user joined', ({ id }) => {
			this.setState({
				userId: id,
			});
		});
		this.props.socket.on('start game', () => {
			console.log('starting game');
			this.sendPoint();
			this.raf = new Raf();
			this.animate();
			document.addEventListener('keydown', ::this.changeDirection);
		});

		this.props.socket.on('update', (user) => {
      if (!this.state.users) {
				this.setState([user]);
				return;
			}
			const localUsers = this.state.users;
			let userIndex = localUsers.findIndex(el => el.id === user.id);
			if (userIndex !== -1) {
				if (Array.isArray(localUsers[userIndex].points)) {
					localUsers[userIndex].points.push(user.points);
				} else {
					localUsers[userIndex].points = [user.points];
				}
			} else {
				localUsers.push(user);
			}
			this.setState({
        users: localUsers,
			})
		});
	}

	sendPoint() {
		this.props.socket.emit('user update', {
			points: this.points[this.points.length-1],
			id: this.state.userId,
		});
	}

	animate() {
		if (this.raf.shouldUpdate()) {
			this.sendPoint();
			this.drawCanvas();
			this.raf.updateStart();
		}
		if (this.endGame) return;
		requestAnimationFrame(() => {
			this.animate();
		})
	}

	// getRandomColor() {
	//   const colors = '0123456789ABCDEF';
	//   const color = ['#'];
	//   for (let i = 0; i < 6; i++) {
	//     const random = colors[Math.ceil(Math.random() * colors.length)];
	//     color.push(random);
	//   }
	//   return color.join('')
	// }


	drawUserLine(ctx, user) {
    if (user.points && user.points.length) {
      user.points.forEach(({ x, y }) => {
        this.drawCircle(ctx, x, y, user.color);
      });
		}
	}

	drawCanvas() {
		if(!(this.state.users && Array.isArray(this.state.users))){
			return;
		}
		const ctx = this.canvas.getContext('2d');
		ctx.clearRect(0, 0, this.width, this.height);
		this.drawGrid(ctx);


		// this.drawCircle(ctx);
		this.state.users.forEach(user => {
			this.drawUserLine(ctx, user);
		});

		this.x += this.dx;
		this.y += this.dy;

		if (this.checkCrossedLine()) {
			console.info('We should definitely stop game here')
		}

		this.points.push({
			x: this.x,
			y: this.y,
		});

		if (this.state.users && this.state.users.length > 1) {
      const newUsers = this.state.users.map(user => {
        if (user.points.length && user.points.length > 50) {
        	user.points.shift();
        }
        return user;
      });
      this.setState({ users: newUsers });
		}


	}

	checkCrossedLine() {
		let result = false;
		if (
			this.x <= 0 ||
			this.x >= this.width ||
			this.y <= 0 ||
			this.y >= this.height
		) {
			// this.endGame = true;
			return false;
		}
		const points = [];
		const currentUser = this.state.users.find(user => user.id === this.state.userId);
    if (!currentUser) {
    	return;
		}
    this.state.users.forEach(user => {
			if (user.id === currentUser.id) {
				return;
			} else {
        if (user.points && user.points.length) {
          user.points.forEach(point => {
          	currentUser.points.forEach(cpoint => {
              if (
                (cpoint.x === point.x)
                && (cpoint.y === point.y)
              ) {
                this.endGame = true;
              }
						});
          })
        }
			}
		});
		return result;
	}

	drawCircle(ctx, x = this.x, y = this.y, color = '#FF0000') {
		ctx.beginPath();
		ctx.rect(x, y, rect, rect);
		ctx.fillStyle = color;
		ctx.fill();
		ctx.strokeStyle = "white";
		ctx.strokeRect(x, y, rect, rect);
		ctx.closePath();
	}

	drawGrid(ctx) {
		const lines = this.width / cell;
		for (let i = 0; i < lines; i++) {
			this.drawLine(ctx, i * cell);
			this.drawLine(ctx, i * cell, true);
		}

	}

	drawLine(ctx, x, isHorizontal) {

		ctx.beginPath();
		if (isHorizontal) {
			ctx.rect(x, 0, 1, this.height);
		} else {
			ctx.rect(0, x, this.width, 1);
		}
		ctx.fillStyle = "#EEE";
		ctx.fill();
		ctx.closePath();
	}

	changeDirection(e) {
		this.directionChanged = true;
		this.prevDirection = this.direction;
		this.direction = e.keyCode;
		switch (e.keyCode) {
			case directions.LEFT:
				this.dx = -Math.abs(this.defaultDx);
				this.dy = 0;
				break;
			case directions.TOP:
				this.dx = 0;
				this.dy = -Math.abs(this.defaultDy);
				break;
			case directions.RIGHT:
				this.dx = Math.abs(this.defaultDx);
				this.dy = 0;
				break;
			case directions.BOTTOM:
				this.dx = 0;
				this.dy = Math.abs(this.defaultDy);
				break;
		}
	}

	render() {
		return (
			<div>
				<canvas
					style={{
						border: '1px solid red'
					}}
					height={this.height}
					width={this.width}
					ref={canvas => {
						this.canvas = canvas;
					}}>

				</canvas>
			</div>
		)
	}
}
export default connect(state => {
	return state.application
}, { setUserName })(Home)