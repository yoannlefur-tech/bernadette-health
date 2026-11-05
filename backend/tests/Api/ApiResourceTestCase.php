<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Test\ApiTestCase;
use ApiPlatform\Test\Client;
use ApiPlatform\Test\Response;

abstract class ApiResourceTestCase extends ApiTestCase
{
    protected static ?bool $alwaysBootKernel = false;

    protected Client $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    /** @param array<string, mixed> $body */
    protected function post(string $uri, array $body): Response
    {
        return $this->client->request('POST', $uri, [
            'headers' => ['Content-Type' => 'application/ld+json', 'Accept' => 'application/ld+json'],
            'json' => $body,
        ]);
    }

    /** @param array<string, mixed> $body */
    protected function patch(string $uri, array $body): Response
    {
        return $this->client->request('PATCH', $uri, [
            'headers' => ['Content-Type' => 'application/merge-patch+json', 'Accept' => 'application/ld+json'],
            'json' => $body,
        ]);
    }

    protected function get(string $uri): Response
    {
        return $this->client->request('GET', $uri, ['headers' => ['Accept' => 'application/ld+json']]);
    }

    protected function delete(string $uri): Response
    {
        return $this->client->request('DELETE', $uri, ['headers' => ['Accept' => 'application/ld+json']]);
    }

    /**
     * @param array<string, mixed> $overrides
     *
     * @return string IRI of the created dog
     */
    protected function createDog(array $overrides = []): string
    {
        $response = $this->post('/api/dogs', $overrides + [
            'name' => 'Bernadette',
            'birth_date' => '2022-03-14',
            'breed' => 'Teckel nain',
            'coat' => 'Poil ras, fauve',
        ]);
        self::assertResponseStatusCodeSame(201);

        return $response->toArray()['@id'];
    }

    /** @return list<string> values of $field for each item of a collection */
    protected function collectionValues(string $uri, string $field): array
    {
        $response = $this->get($uri);
        self::assertResponseIsSuccessful();

        return array_column($response->toArray()['member'], $field);
    }

    /** @return string a date relative to today, as sent to the API */
    protected static function day(string $modifier): string
    {
        return (new \DateTimeImmutable($modifier))->format('Y-m-d');
    }
}
