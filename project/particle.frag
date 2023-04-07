#version 420 compatibility
in float life;
uniform float screen_x;
uniform float screen_y;
layout(binding = 0) uniform sampler2D colortexture;

void main()
{

	// Basse color.
	gl_FragColor = texture2D(colortexture, gl_PointCoord);
	//gl_FragColor = vec4(0.9f,0.3f,0.1f,1.0f);
	// Make it darker the older it is.
	gl_FragColor.xyz *= (1.0 - life);
	// Make it fade out the older it is, also all particles have a
	// very low base alpha so they blend together.
	//gl_FragColor.w = gl_FragColor.w * (1.0 - pow(life, 4.0)) * 0.05;
	gl_FragColor.w = gl_FragColor.w * (1.0 - pow(life, 4.0)) * 0.03;
 	//gl_FragColor = vec4(0.0f,0.9f,0.2f,1.0f);
}