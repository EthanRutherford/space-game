import React, {useState, forwardRef} from "react";

export const AnimatedInput = forwardRef(function AnimatedInput({
	className,
	hoverClass,
	activeClass,
	onClick,
	...rest
}, ref) {
	const [state, setState] = useState({});

	function animationHandler() {
		if (state.hovering && !state.hovered) {
			setState({});
		}
		if (state.active) {
			setState({});
			if (onClick instanceof Function) onClick();
		}
	}

	const Type = activeClass ? "button" : "input";
	const classToUse = `${className} ${state.active ? activeClass : state.hovering ? hoverClass : ""}`;

	return (
		<Type
			className={classToUse}
			onMouseEnter={() => setState({hovered: true, hovering: true})}
			onMouseLeave={() => setState((old) => ({...old, hovered: false}))}
			onClick={() => activeClass && setState({active: true})}
			onAnimationEnd={animationHandler}
			onAnimationIteration={animationHandler}
			ref={ref}
			{...rest}
		/>
	);
});
