<?php

declare(strict_types=1);

namespace App\EventListener;

use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationFailureEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Events;
use Lexik\Bundle\JWTAuthenticationBundle\Response\JWTAuthenticationFailureResponse;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Exception\TooManyLoginAttemptsAuthenticationException;

/**
 * The Lexik failure handler answers 401 to every authentication failure. A
 * throttled login is not a wrong password: a client must be able to tell them
 * apart, and to know when to try again.
 */
#[AsEventListener(event: Events::AUTHENTICATION_FAILURE)]
final class LoginThrottledListener
{
    public function __invoke(AuthenticationFailureEvent $event): void
    {
        $exception = $event->getException();

        if (!$exception instanceof TooManyLoginAttemptsAuthenticationException) {
            return;
        }

        $data = $exception->getMessageData();
        $response = new JWTAuthenticationFailureResponse(
            strtr($exception->getMessageKey(), $data),
            Response::HTTP_TOO_MANY_REQUESTS,
        );
        $response->headers->set('Retry-After', (string) (60 * max(1, (int) $data['%count%'])));

        $event->setResponse($response);
    }
}
