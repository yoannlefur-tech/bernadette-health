<?php

declare(strict_types=1);

namespace App\OpenApi;

use ApiPlatform\OpenApi\Factory\OpenApiFactoryInterface;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\PathItem;
use ApiPlatform\OpenApi\OpenApi;
use Symfony\Component\DependencyInjection\Attribute\AsDecorator;
use Symfony\Component\DependencyInjection\Attribute\AutowireDecorated;

/**
 * Documents the logout, which neither Lexik nor the refresh token bundle cover.
 * The priority makes it run after their own decorators (0 and -25).
 */
#[AsDecorator(decorates: 'api_platform.openapi.factory', priority: -50)]
final readonly class AuthOpenApiFactory implements OpenApiFactoryInterface
{
    public function __construct(
        #[AutowireDecorated]
        private OpenApiFactoryInterface $decorated,
    ) {
    }

    public function __invoke(array $context = []): OpenApi
    {
        $open_api = ($this->decorated)($context);

        $open_api->getPaths()->addPath('/api/auth/logout', (new PathItem())->withPost(
            (new Operation())
                ->withOperationId('auth_logout_post')
                ->withTags(['Login Check'])
                ->withSummary('Invalidates the refresh token and removes its cookie.')
                ->withDescription('The refresh token is read from the "refresh_token" cookie, so the request needs no body.')
                ->withResponses([
                    200 => ['description' => 'Refresh token invalidated, or already invalid'],
                    400 => ['description' => 'No refresh token in the request'],
                ])
        ));

        return $open_api;
    }
}
