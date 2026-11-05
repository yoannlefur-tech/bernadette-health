<?php

use App\Kernel;

// Dev server only (php -S with this file as router): let it serve existing
// public files itself, with their real Content-Type.
if ('cli-server' === PHP_SAPI && is_file(__DIR__.parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH))) {
    return false;
}

require_once dirname(__DIR__).'/vendor/autoload_runtime.php';

return static function (array $context) {
    return new Kernel($context['APP_ENV'], (bool) $context['APP_DEBUG']);
};
