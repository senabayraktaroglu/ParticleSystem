#include "ParticleSystem.h"
#include <GL/glew.h>
#include <cmath>
#include <cstdlib>
#include <algorithm>
#include <chrono>

#include <labhelper.h>
#include <imgui.h>
#include <imgui_impl_sdl_gl3.h>

#include <glm/glm.hpp>
#include <glm/gtx/transform.hpp>
const float height = 30.0f;
const float gravity = 500.0f;

void ParticleSystem::process_particles(float dt, glm::mat4 model,glm::vec3 drag_pos) {
	
	for (unsigned i = 0; i < particles.size(); ++i) {
		// Kill dead particles!
		if (particles[i].lifetime > particles[i].life_length) {
			kill(i);
		}

	}
	for (unsigned i = 0; i < 64 && particles.size()< max_size; i++)
	{
		const float theta = labhelper::uniform_randf(0.f, 2.f * M_PI);
		//const float u = labhelper::uniform_randf(-1.f, 1.f);
		const float u = labhelper::uniform_randf(0.95f, 1.f);
		//const glm::vec3 vol = 1.0f * glm::vec3(sqrt(1.f - u * u) * cosf(theta), u, sqrt(1.f - u * u) * sinf(theta));
		glm::mat3 temp = glm::mat3(model);
		
		
		const glm::vec3 vol = temp  * glm::vec3(u, sqrt(1.f - u * u) * cosf(theta), sqrt(1.f - u * u) * sinf(theta));

		Particle p;
		p.velocity = vol;
		p.lifetime = 0;
		p.life_length = 5;
		p.pos = glm::vec3(model * glm::vec4( drag_pos,1.0f));
		spawn(p);

	}
	for (unsigned i = 0; i < particles.size(); ++i) {
		// Update alive particles!
		
		particles[i].lifetime += dt;
		particles[i].pos += particles[i].velocity *15.0f* dt;

		glm::vec3 dfall = glm::vec3(0.0f, gravity * dt * dt, 0.0f);
		particles[i].pos += dfall;
	}
}
void ParticleSystem::spawn(Particle particle)
{
	int number = particles.size();
	if (number < max_size)
	{
		particles.push_back(particle);
	}
	
}
void ParticleSystem::kill(int id)
{
	
	int tail = particles.size();
	Particle temp;
	temp = particles[id];
	particles[id] = particles[tail - 1];
	particles[tail - 1] = temp;
	particles.pop_back();
	
}
std::vector<glm::vec4> ParticleSystem::generate_data(glm::mat4 model,glm::mat4 viewMatrix) {
	std::vector<glm::vec4> rt;
	for (int i = 0; i < particles.size(); i++)
	{
		glm::vec3 temppos = glm::vec3(glm::mat4(viewMatrix) * (glm::vec4(particles[i].pos, 1.0f)));
		glm::vec4 temp =  glm::vec4(temppos, particles[i].lifetime);
		rt.push_back(temp);
	}
	std::sort(rt.begin(), std::next(rt.begin(), particles.size()),
		[](const glm::vec4& lhs, const glm::vec4& rhs) { return lhs.z < rhs.z; }
	);
	return rt;
}