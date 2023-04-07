#version 420

layout(location = 0) in vec3 position;
uniform mat4 modelViewProjectionMatrix;

void main()
{
	
	gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);
//	gl_Position = gl_Position * vec4((position.xy * scale),0.0,1.0f);
}
