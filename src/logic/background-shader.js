const {shaders: {BackgroundShader}} = require("2d-gl");

class SpaceBgShader extends BackgroundShader {
	constructor(gl) {
		super(gl, `
			varying highp vec2 vWorld;

			highp float bimod(float i, float by) {
				if (i > by) {
					return mod(i, by);
				}
				if (i < -by) {
					return -mod(-i, by);
				}

				return i;
			}
		
			highp float rand(vec2 co) {
				// the rand gets a bit odd when the inputs get too big.
				// to combat this, loop it at 50,000
				co.x = bimod(co.x, 50000.0);
				co.y = bimod(co.y, 50000.0);

				// original code
				highp float a = 12.9898;
				highp float b = 78.233;
				highp float c = 43758.5453;
				highp float dt = dot(co.xy, vec2(a, b));
				highp float sn = mod(dt, 3.14);
				return fract(sin(sn) * c);
			}
		
			void main() {
				highp vec2 xy = vWorld * 20.0;
				highp vec2 rxy = floor(xy + .5);
				highp float r = rand(rxy);
		
				if (r > .999) {
					highp float str = 1.0 - distance(xy, rxy) * 2.0;
					gl_FragColor = vec4(str, str, str, 1);
				} else {
					gl_FragColor = vec4(0, 0, 0, 1);
				}
			}
		`);
	}
}

module.exports = SpaceBgShader;
