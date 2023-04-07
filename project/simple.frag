#version 420

// required by GLSL spec Sect 4.5.3 (though nvidia does not, amd does)
precision highp float;

uniform vec3 material_color;

layout(location = 0) out vec4 fragmentColor;

void main()
{
	//fragmentColor = vec4(material_color, 1.0);
	//fragmentColor = vec4(gl_FragCoord.z);
	fragmentColor = vec4(0.0f,0.6f,0.3f,1.0f);
}
