<?php

declare(strict_types=1);

namespace App\EventListener;

use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Turns a foreign key violation into a 409. The original message contains the
 * raw SQL statement, and 4xx messages are exposed in the API response, so it
 * is replaced rather than mapped through api_platform.exception_to_status.
 */
#[AsEventListener(event: KernelEvents::EXCEPTION, priority: 1)]
final class ForeignKeyConflictListener
{
    public function __invoke(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();

        if ($exception instanceof ForeignKeyConstraintViolationException) {
            $event->setThrowable(new ConflictHttpException(
                'This resource is still referenced by other records.',
                $exception,
            ));
        }
    }
}
