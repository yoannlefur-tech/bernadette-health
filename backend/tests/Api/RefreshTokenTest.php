<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Test\Response;
use App\Entity\RefreshToken;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Component\BrowserKit\Cookie;

final class RefreshTokenTest extends ApiResourceTestCase
{
    private const EMAIL = 'owner@example.com';

    protected function setUp(): void
    {
        // The cookie is Secure outside dev, so the client must speak https to send it back.
        $this->client = static::createClient([], ['base_uri' => 'https://localhost']);
        static::getContainer()->get('cache.rate_limiter')->clear();
        $this->createUser(self::EMAIL);
    }

    private function login(): Response
    {
        $response = $this->client->request('POST', '/api/auth/login', [
            'json' => ['email' => self::EMAIL, 'password' => self::PASSWORD],
        ]);
        self::assertResponseIsSuccessful();

        return $response;
    }

    /** @param array<string, string> $headers */
    private function send(string $method, string $uri, array $headers = []): Response
    {
        return $this->client->request($method, $uri, ['headers' => $headers]);
    }

    private function cookieValue(): ?string
    {
        return $this->client->getCookieJar()->get('refresh_token', '/api/auth', 'localhost')?->getValue();
    }

    private function setCookieValue(string $value): void
    {
        $this->client->getCookieJar()->set(new Cookie('refresh_token', $value, null, '/api/auth', 'localhost', true, true));
    }

    /** @return array<string, string> an Authorization header holding an expired access token */
    private function expiredBearer(): array
    {
        $token = static::getContainer()->get(JWTEncoderInterface::class)->encode([
            'username' => self::EMAIL,
            'exp' => time() - 60,
        ]);

        return ['Authorization' => 'Bearer '.$token];
    }

    public function testLoginSetsTheCookieAndKeepsTheTokenOutOfTheBody(): void
    {
        $response = $this->login();

        self::assertArrayNotHasKey('refresh_token', $response->toArray());
        $set_cookie = strtolower($response->getHeaders()['set-cookie'][0]);
        self::assertStringStartsWith('refresh_token=', $set_cookie);
        self::assertStringContainsString('max-age=2592000', $set_cookie);
        self::assertStringContainsString('path=/api/auth', $set_cookie);
        self::assertStringContainsString('secure', $set_cookie);
        self::assertStringContainsString('httponly', $set_cookie);
        self::assertStringContainsString('samesite=lax', $set_cookie);
    }

    public function testOnlyAHashOfTheTokenIsStored(): void
    {
        $this->login();

        $stored = static::getContainer()->get(EntityManagerInterface::class)
            ->getRepository(RefreshToken::class)
            ->findAll();

        self::assertCount(1, $stored);
        self::assertNotSame($this->cookieValue(), $stored[0]->getRefreshToken());
    }

    public function testRefreshReturnsANewAccessTokenAndRotatesTheCookie(): void
    {
        $this->login();
        $first_cookie = $this->cookieValue();

        $response = $this->send('POST', '/api/auth/refresh');

        self::assertResponseIsSuccessful();
        self::assertNotEmpty($response->toArray()['token']);
        self::assertArrayNotHasKey('refresh_token', $response->toArray());
        self::assertNotSame($first_cookie, $this->cookieValue());

        $this->send('GET', '/api/dogs', ['Authorization' => 'Bearer '.$response->toArray()['token']]);
        self::assertResponseIsSuccessful();
    }

    public function testARotatedTokenCannotBeReused(): void
    {
        $this->login();
        $first_cookie = $this->cookieValue();
        $this->send('POST', '/api/auth/refresh');
        self::assertResponseIsSuccessful();

        $this->setCookieValue($first_cookie);
        $this->send('POST', '/api/auth/refresh');

        self::assertResponseStatusCodeSame(401);
    }

    public function testRefreshWithoutCookieIsRefused(): void
    {
        $this->send('POST', '/api/auth/refresh');

        self::assertResponseStatusCodeSame(401);
    }

    public function testRefreshWithUnknownTokenIsRefused(): void
    {
        $this->setCookieValue('unknown');

        $this->send('POST', '/api/auth/refresh');

        self::assertResponseStatusCodeSame(401);
    }

    public function testRefreshWorksWithAnExpiredAccessToken(): void
    {
        $this->login();

        $response = $this->send('POST', '/api/auth/refresh', $this->expiredBearer());

        self::assertResponseIsSuccessful();
        self::assertNotEmpty($response->toArray()['token']);
    }

    public function testLogoutInvalidatesTheTokenAndRemovesTheCookie(): void
    {
        $this->login();
        $cookie = $this->cookieValue();

        $response = $this->send('POST', '/api/auth/logout');

        self::assertResponseIsSuccessful();
        $set_cookie = strtolower($response->getHeaders()['set-cookie'][0]);
        self::assertStringStartsWith('refresh_token=deleted', $set_cookie);
        self::assertStringContainsString('path=/api/auth', $set_cookie);
        self::assertNull($this->cookieValue());

        $this->setCookieValue($cookie);
        $this->send('POST', '/api/auth/refresh');
        self::assertResponseStatusCodeSame(401);
    }

    public function testLogoutWorksWithAnExpiredAccessToken(): void
    {
        $this->login();

        $this->send('POST', '/api/auth/logout', $this->expiredBearer());

        self::assertResponseIsSuccessful();
        self::assertNull($this->cookieValue());
    }

    public function testLogoutWithoutCookieIsABadRequest(): void
    {
        $this->send('POST', '/api/auth/logout');

        self::assertResponseStatusCodeSame(400);
    }

    public function testGetCannotRefreshNorLogout(): void
    {
        $this->login();
        $cookie = $this->cookieValue();

        $this->send('GET', '/api/auth/refresh');
        self::assertResponseStatusCodeSame(405);
        $this->send('GET', '/api/auth/logout');
        self::assertResponseStatusCodeSame(405);

        self::assertSame($cookie, $this->cookieValue());
        $this->send('POST', '/api/auth/refresh');
        self::assertResponseIsSuccessful();
    }
}
