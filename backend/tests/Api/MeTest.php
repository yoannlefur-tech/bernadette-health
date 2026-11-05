<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Metadata\IriConverterInterface;

final class MeTest extends ApiResourceTestCase
{
    public function testReturnsTheCurrentUser(): void
    {
        $user = $this->createUser('owner@example.com');
        $this->createUser('other@example.com');
        $this->actingAs($user);

        $response = $this->get('/api/me');

        self::assertResponseIsSuccessful();
        $body = $response->toArray();
        self::assertSame($user->getId()->toRfc4122(), $body['id']);
        self::assertSame('owner@example.com', $body['email']);
        self::assertSame(['ROLE_USER'], $body['roles']);
    }

    public function testExposesNothingElse(): void
    {
        $this->actingAs($this->createUser());

        $response = $this->get('/api/me');

        self::assertEqualsCanonicalizing(
            ['@context', '@id', '@type', 'id', 'email', 'roles'],
            array_keys($response->toArray()),
        );
        self::assertStringNotContainsString('password', $response->getContent());
    }

    public function testAnonymousRequestIsRefused(): void
    {
        $this->actingAsAnonymous();

        $this->get('/api/me');

        self::assertResponseStatusCodeSame(401);
    }

    public function testOtherUsersCannotBeRead(): void
    {
        $other = $this->createUser('other@example.com');
        $this->actingAs($this->createUser('owner@example.com'));

        $this->get('/api/users/'.$other->getId()->toRfc4122());

        self::assertResponseStatusCodeSame(404);
    }

    public function testIriOfAUserIsNotTheCurrentUserEndpoint(): void
    {
        $user = $this->createUser();

        $iri = static::getContainer()->get(IriConverterInterface::class)->getIriFromResource($user);

        self::assertSame('/api/users/'.$user->getId()->toRfc4122(), $iri);
    }
}
