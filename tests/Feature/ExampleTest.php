<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_returns_a_successful_response(): void
    {
        $response = $this->get(route('home'));

        $response->assertRedirect('/Frontend/stitch/html/P1%20Seguridad%20y%20Autenticaci%C3%B3n/cu01-iniciar-sesion.html');
    }
}
