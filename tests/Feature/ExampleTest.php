<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_returns_a_successful_response(): void
    {
        $response = $this->get(route('home'));

        $response->assertRedirect('/Frontend/nueva_interfaces/index.html');
    }
}
