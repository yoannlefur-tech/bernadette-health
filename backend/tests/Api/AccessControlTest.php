<?php

declare(strict_types=1);

namespace App\Tests\Api;

use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpFoundation\Request;

final class AccessControlTest extends ApiResourceTestCase
{
    private const ALLOWED_ORIGIN = 'http://localhost:5174';

    /** @return iterable<string, array{string, string}> */
    public static function protectedRoutes(): iterable
    {
        yield 'entrypoint' => ['GET', '/api'];
        yield 'current user' => ['GET', '/api/me'];
        yield 'dogs' => ['GET', '/api/dogs'];
        yield 'create dog' => ['POST', '/api/dogs'];
        yield 'weight entries' => ['GET', '/api/weight_entries'];
        yield 'vaccinations' => ['GET', '/api/vaccinations'];
        yield 'vet visits' => ['GET', '/api/vet_visits'];
        yield 'context' => ['GET', '/api/contexts/Dog'];
    }

    #[DataProvider('protectedRoutes')]
    public function testAnonymousRequestIsRefused(string $method, string $uri): void
    {
        $this->client->request($method, $uri, [
            'headers' => ['Accept' => 'application/ld+json', 'Content-Type' => 'application/ld+json'],
            'body' => '{}',
        ]);

        self::assertResponseStatusCodeSame(401);
    }

    public function testAnonymousRequestOnAnItemIsRefused(): void
    {
        $dog = $this->createDog();

        $this->actingAsAnonymous();

        foreach (['GET', 'DELETE'] as $method) {
            $this->client->request($method, $dog, ['headers' => ['Accept' => 'application/ld+json']]);
            self::assertResponseStatusCodeSame(401);
        }
    }

    /** @return iterable<string, array{string, string}> */
    public static function accessRules(): iterable
    {
        yield 'login' => ['/api/auth/login', 'PUBLIC_ACCESS'];
        yield 'refresh' => ['/api/auth/refresh', 'PUBLIC_ACCESS'];
        yield 'logout' => ['/api/auth/logout', 'PUBLIC_ACCESS'];
        yield 'docs' => ['/api/docs', 'PUBLIC_ACCESS'];
        yield 'docs format' => ['/api/docs.jsonopenapi', 'PUBLIC_ACCESS'];
        yield 'looks like auth' => ['/api/authors', 'IS_AUTHENTICATED_FULLY'];
        yield 'looks like docs' => ['/api/docsearch', 'IS_AUTHENTICATED_FULLY'];
        yield 'entrypoint' => ['/api', 'IS_AUTHENTICATED_FULLY'];
    }

    /** These routes do not all exist: the router answers 404 before the firewall when they do not. */
    #[DataProvider('accessRules')]
    public function testAccessRuleOfAPath(string $path, string $expected_role): void
    {
        [$roles] = static::getContainer()->get('security.access_map')->getPatterns(Request::create($path));

        self::assertSame([$expected_role], $roles);
    }

    public function testDocumentationIsPublic(): void
    {
        $this->client->request('GET', '/api/docs', ['headers' => ['Accept' => 'text/html']]);
        self::assertResponseIsSuccessful();

        $this->client->request('GET', '/api/docs.jsonopenapi', ['headers' => ['Accept' => 'application/vnd.openapi+json']]);
        self::assertResponseIsSuccessful();
    }

    public function testPreflightFromTheFrontendAllowsCredentials(): void
    {
        $this->client->request('OPTIONS', '/api/auth/refresh', [
            'headers' => [
                'Origin' => self::ALLOWED_ORIGIN,
                'Access-Control-Request-Method' => 'POST',
                'Access-Control-Request-Headers' => 'authorization,content-type',
            ],
        ]);

        self::assertResponseHeaderSame('access-control-allow-origin', self::ALLOWED_ORIGIN);
        self::assertResponseHeaderSame('access-control-allow-credentials', 'true');
        $allowed_headers = strtolower((string) self::getClient()->getResponse()->headers->get('access-control-allow-headers'));
        self::assertStringContainsString('authorization', $allowed_headers);
        self::assertStringContainsString('content-type', $allowed_headers);
    }

    /** @return iterable<string, array{string}> */
    public static function refusedOrigins(): iterable
    {
        yield 'other port' => ['http://localhost:5175'];
        yield 'other scheme' => ['https://localhost:5174'];
        yield 'other host' => ['http://127.0.0.1:5174'];
        yield 'other domain' => ['https://evil.example.com'];
        yield 'allowed origin as a prefix' => ['http://localhost:5174.evil.example.com'];
    }

    #[DataProvider('refusedOrigins')]
    public function testOtherOriginsAreNotAllowed(string $origin): void
    {
        $this->client->request('OPTIONS', '/api/dogs', [
            'headers' => ['Origin' => $origin, 'Access-Control-Request-Method' => 'GET'],
        ]);

        self::assertResponseNotHasHeader('access-control-allow-origin');

        $this->client->request('GET', '/api/docs.jsonopenapi', [
            'headers' => ['Origin' => $origin, 'Accept' => 'application/vnd.openapi+json'],
        ]);

        self::assertResponseIsSuccessful();
        self::assertResponseNotHasHeader('access-control-allow-origin');
        self::assertResponseNotHasHeader('access-control-allow-credentials');
    }

    public function testRefusedResponseStillCarriesCorsHeaders(): void
    {
        $this->client->request('GET', '/api/dogs', [
            'headers' => ['Origin' => self::ALLOWED_ORIGIN, 'Accept' => 'application/ld+json'],
        ]);

        self::assertResponseStatusCodeSame(401);
        self::assertResponseHeaderSame('access-control-allow-origin', self::ALLOWED_ORIGIN);
    }
}
