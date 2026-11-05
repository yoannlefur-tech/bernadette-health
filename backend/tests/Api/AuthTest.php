<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Test\Response;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;

final class AuthTest extends ApiResourceTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // The limiter state is stored outside the database, so it survives the
        // rollback between tests and even between two runs of the suite.
        static::getContainer()->get('cache.rate_limiter')->clear();
    }

    private function login(string $email, string $password = self::PASSWORD): Response
    {
        return $this->client->request('POST', '/api/auth/login', [
            'json' => ['email' => $email, 'password' => $password],
        ]);
    }

    /** @return array<string, mixed> claims of a token, without checking its signature */
    private static function claims(string $token): array
    {
        return json_decode(base64_decode(strtr(explode('.', $token)[1], '-_', '+/')), true, flags: \JSON_THROW_ON_ERROR);
    }

    private function getDogsWithToken(string $token): void
    {
        $this->client->request('GET', '/api/dogs', [
            'headers' => ['Accept' => 'application/ld+json', 'Authorization' => 'Bearer '.$token],
        ]);
    }

    public function testLoginReturnsAFifteenMinutesToken(): void
    {
        $this->createUser('owner@example.com');

        $response = $this->login('owner@example.com');

        self::assertResponseIsSuccessful();
        $claims = self::claims($response->toArray()['token']);
        self::assertSame(900, $claims['exp'] - $claims['iat']);
        self::assertSame('owner@example.com', $claims['username']);
    }

    public function testLoginTokenIsAccepted(): void
    {
        $this->createUser('owner@example.com');

        $this->getDogsWithToken($this->login('owner@example.com')->toArray()['token']);

        self::assertResponseIsSuccessful();
    }

    public function testLoginIgnoresTheCaseOfTheEmail(): void
    {
        $this->createUser('owner@example.com');

        $response = $this->login('Owner@EXAMPLE.com');

        self::assertResponseIsSuccessful();
        self::assertSame('owner@example.com', self::claims($response->toArray()['token'])['username']);
    }

    public function testWrongPasswordAndUnknownUserAreIndistinguishable(): void
    {
        $this->createUser('owner@example.com');

        $wrong_password = $this->login('owner@example.com', 'wrong password');
        self::assertResponseStatusCodeSame(401);

        $unknown_user = $this->login('nobody@example.com');
        self::assertResponseStatusCodeSame(401);

        self::assertSame($wrong_password->getContent(false), $unknown_user->getContent(false));
    }

    public function testLoginIsThrottledAfterFiveFailures(): void
    {
        $this->createUser('owner@example.com');

        for ($attempt = 0; $attempt < 5; ++$attempt) {
            $this->login('owner@example.com', 'wrong password');
            self::assertResponseStatusCodeSame(401);
        }

        // Refused even with the right password, and whatever the case of the email.
        $response = $this->login('OWNER@example.com');

        self::assertResponseStatusCodeSame(429);
        self::assertArrayNotHasKey('token', $response->toArray(false));
        self::assertGreaterThan(0, (int) $response->getHeaders(false)['retry-after'][0]);
    }

    public function testLoginOnlyAcceptsPost(): void
    {
        $this->client->request('GET', '/api/auth/login');

        self::assertResponseStatusCodeSame(405);
    }

    public function testExpiredTokenIsRefused(): void
    {
        $token = static::getContainer()->get(JWTEncoderInterface::class)->encode([
            'username' => $this->createUser()->getUserIdentifier(),
            'exp' => time() - 60,
        ]);

        $this->getDogsWithToken($token);

        self::assertResponseStatusCodeSame(401);
    }

    public function testTokenWithAlteredSignatureIsRefused(): void
    {
        $token = $this->login($this->createUser()->getUserIdentifier())->toArray()['token'];
        [$header, $payload, $signature] = explode('.', $token);
        $altered = strrev($signature);

        $this->getDogsWithToken(implode('.', [$header, $payload, $altered]));

        self::assertResponseStatusCodeSame(401);
    }

    public function testMalformedTokenIsRefused(): void
    {
        $this->getDogsWithToken('not-a-token');

        self::assertResponseStatusCodeSame(401);
    }
}
