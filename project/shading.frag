#version 420

// required by GLSL spec Sect 4.5.3 (though nvidia does not, amd does)
precision highp float;

///////////////////////////////////////////////////////////////////////////////
// Material
///////////////////////////////////////////////////////////////////////////////
uniform vec3 material_color;
uniform float material_reflectivity;
uniform float material_metalness;
uniform float material_fresnel;
uniform float material_shininess;
uniform float material_emission;

uniform int has_emission_texture;
layout(binding = 5) uniform sampler2D emissiveMap;

///////////////////////////////////////////////////////////////////////////////
// Environment
///////////////////////////////////////////////////////////////////////////////
layout(binding = 6) uniform sampler2D environmentMap;
layout(binding = 7) uniform sampler2D irradianceMap;
layout(binding = 8) uniform sampler2D reflectionMap;
uniform float environment_multiplier;

///////////////////////////////////////////////////////////////////////////////
// Light source
///////////////////////////////////////////////////////////////////////////////
uniform vec3 point_light_color = vec3(1.0, 1.0, 1.0);
uniform float point_light_intensity_multiplier = 50.0;

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////
#define PI 3.14159265359

///////////////////////////////////////////////////////////////////////////////
// Input varyings from vertex shader
///////////////////////////////////////////////////////////////////////////////
in vec2 texCoord;
in vec3 viewSpaceNormal;
in vec3 viewSpacePosition;
in vec4 shadowMapCoord;
//layout(binding = 10) uniform sampler2D shadowMapTex;
layout(binding = 10) uniform sampler2DShadow shadowMapTex;
///////////////////////////////////////////////////////////////////////////////
// Input uniform variables
///////////////////////////////////////////////////////////////////////////////
uniform mat4 viewInverse;
uniform vec3 viewSpaceLightPosition;
uniform mat4 lightMatrix;
uniform vec3 viewSpaceLightDir;
uniform float spotOuterAngle;
uniform float spotInnerAngle;
///////////////////////////////////////////////////////////////////////////////
// Output color
///////////////////////////////////////////////////////////////////////////////
layout(location = 0) out vec4 fragmentColor;


vec3 calculateDirectIllumiunation(vec3 wo, vec3 n)
{	
	vec3 lightDirection = normalize(viewSpaceLightPosition - viewSpacePosition.xyz);
	vec3 wi = lightDirection;
	//vec3 direct_illum = base_color;
	///////////////////////////////////////////////////////////////////////////
	// Task 1.2 - Calculate the radiance Li from the light, and the direction
	//            to the light. If the light is backfacing the triangle,
	//            return vec3(0);
	///////////////////////////////////////////////////////////////////////////
	float dx = (viewSpacePosition.x-viewSpaceLightPosition.x)*(viewSpacePosition.x-viewSpaceLightPosition.x) ;
	float dy = (viewSpacePosition.y-viewSpaceLightPosition.y)*(viewSpacePosition.y-viewSpaceLightPosition.y) ;
	float dz = (viewSpacePosition.z-viewSpaceLightPosition.z)*(viewSpacePosition.z-viewSpaceLightPosition.z) ;
	float d = dx + dy + dz ;
	vec3 Li = point_light_intensity_multiplier*point_light_color*(1/d);
		///////////////////////////////////////////////////////////////////////////
		// Task 1.3 - Calculate the diffuse term and return that as the result
		///////////////////////////////////////////////////////////////////////////
	if (dot(wi, n) < 0||dot(wo, n) < 0)
		return vec3(0);
	

	//direct_illum = material_color*(1.0/PI)*abs(dot(n,wi))*Li;
	vec3 diffuse_term = material_color*(1.0/PI)*abs(dot(n,wi))*Li;
	///////////////////////////////////////////////////////////////////////////
	// Task 2 - Calculate the Torrance Sparrow BRDF and return the light
	//          reflected from that instead
	///////////////////////////////////////////////////////////////////////////
	
	vec3 wh = normalize(wi+wo);
	
	float F_wi = material_fresnel + (1-material_fresnel)*pow((1-abs(dot(wh,wi))),5); 

	float D_wh = (material_shininess + 2)/(2*PI)*pow( dot(n,wh),material_shininess);

	float G = min(1, min(2 * abs(dot(n, wh)) * abs(dot(n , wo)) / abs(dot(wo, wh)), 2 * abs(dot(n, wh)) * abs(dot(n, wi)) / abs(dot(wo, wh))));

	float brdf = (F_wi*D_wh*G)/(4*dot(n,wo)*dot(n,wi));
	//direct_illum = brdf*dot(n,wi)*Li;
	///////////////////////////////////////////////////////////////////////////
	// Task 3 - Make your shader respect the parameters of our material model.
	///////////////////////////////////////////////////////////////////////////
	vec3 dielectric_term = brdf* dot(n,wi)*Li + (1-F_wi)*diffuse_term;
	vec3 metal_term = brdf*material_color*dot(n,wi)*Li;
	vec3 microfacet_term = material_metalness* metal_term + (1-material_metalness)*dielectric_term;
	float r= material_reflectivity;
	vec3 direct_illum = r* microfacet_term + (1-r)* diffuse_term;
	return direct_illum;
}

vec3 calculateIndirectIllumination(vec3 wo, vec3 n)
{
	vec3 indirect_illum = vec3(0.f);
	
	vec3 n_ws =vec3(viewInverse * vec4(n, 0.0));
	///////////////////////////////////////////////////////////////////////////
	// Task 5 - Lookup the irradiance from the irradiance map and calculate
	//          the diffuse reflection
	///////////////////////////////////////////////////////////////////////////
	// Calculate the world-space direction from the camera to that position
	//vec3 dir = normalize(pixel_world_pos.xyz - camera_pos);

	// Calculate the spherical coordinates of the direction
	
	float theta = acos(max(-1.0f, min(1.0f, n_ws.y)));
	float phi = atan(n_ws.z, n_ws.x);
	if(phi < 0.0f)
	{
		phi = phi + 2.0f * PI;
	}

	// Use these to lookup the color in the environment map
	vec2 lookup = vec2(phi / (2.0 * PI), theta / PI);
	vec4 irradiance = environment_multiplier * texture(irradianceMap, lookup);

	vec3 diffuse_term = material_color * (1.0 / PI) * irradiance.xyz;
	
	indirect_illum = diffuse_term;
	///////////////////////////////////////////////////////////////////////////
	// Task 6 - Look up in the reflection map from the perfect specular
	//          direction and calculate the dielectric and metal terms.
	///////////////////////////////////////////////////////////////////////////
	vec3 wi = reflect(-wo,n);
	//vec3 wi = -wi + n *(2*dot(wi,wo));
	vec3 wh = normalize(wi+wo);
	
	
	vec3 wr_ws =vec3(viewInverse * vec4(wi, 0.0));
		// Calculate the spherical coordinates of the direction

	theta = acos(max(-1.0f, min(1.0f, wr_ws.y)));
	phi = atan(wr_ws.z, wr_ws.x);
	if(phi < 0.0f)
	{
		phi = phi + 2.0f * PI;
	}
	lookup = vec2(phi / (2.0 * PI), theta / PI);
	
	float roughness = sqrt(sqrt(2/(material_shininess+2)));
	vec3 Li = environment_multiplier * textureLod(reflectionMap,lookup,roughness * 7.0).xyz;

	float F_wi = material_fresnel + (1-material_fresnel)*pow((1-abs(dot(wh,wi))),5); 
	vec3 dielectric_term = F_wi * Li + (1-F_wi)* diffuse_term;
	vec3 metal_term = F_wi * material_color * Li;
	
	vec3 microfacet_term = material_metalness* metal_term + (1-material_metalness)*dielectric_term;
	float r= material_reflectivity;
	indirect_illum = r* microfacet_term + (1-r)* diffuse_term;
	
	return indirect_illum;
}



void main()
{
	float visibility = 1.0;
	float attenuation = 1.0;

	//vec4 shadowMapCoord = lightMatrix * vec4(viewSpacePosition, 1.f);
	
	//float depth = texture(shadowMapTex, shadowMapCoord.xy / shadowMapCoord.w).x;
	//visibility = (depth >= (shadowMapCoord.z / shadowMapCoord.w)) ? 1.0 : 0.0;
	visibility = textureProj( shadowMapTex, shadowMapCoord );
	//vec3 viewSpaceLightDir = -normalize(viewSpaceLightPosition);

	vec3 posToLight = normalize(viewSpaceLightPosition - viewSpacePosition);
	float cosAngle = dot(posToLight, -viewSpaceLightDir);

	// Spotlight with hard border:
	//float spotAttenuation = (cosAngle > spotOuterAngle) ? 1.0 : 0.0;


	float spotAttenuation = smoothstep(spotOuterAngle, spotInnerAngle, cosAngle);
	visibility *= spotAttenuation;

	vec3 wo = -normalize(viewSpacePosition);
	vec3 n = normalize(viewSpaceNormal);

	// Direct illumination
	vec3 direct_illumination_term = visibility * calculateDirectIllumiunation(wo, n);

	// Indirect illumination
	vec3 indirect_illumination_term = calculateIndirectIllumination(wo, n);

	///////////////////////////////////////////////////////////////////////////
	// Add emissive term. If emissive texture exists, sample this term.
	///////////////////////////////////////////////////////////////////////////
	vec3 emission_term = material_emission * material_color;
	if(has_emission_texture == 1)
	{
		emission_term = texture(emissiveMap, texCoord).xyz;
	}

	vec3 shading = direct_illumination_term + indirect_illumination_term + emission_term;

	

	fragmentColor = vec4(shading, 1.0);
	return;
}
