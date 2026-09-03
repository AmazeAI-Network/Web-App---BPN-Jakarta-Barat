<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('demo_accounts', function (Blueprint $table) {
            if (! Schema::hasColumn('demo_accounts', 'session_token')) {
                $table->string('session_token', 64)->nullable()->index()->after('last_login');
            }

            if (! Schema::hasColumn('demo_accounts', 'session_expires_at')) {
                $table->timestamp('session_expires_at')->nullable()->after('session_token');
            }
        });
    }

    public function down(): void
    {
        Schema::table('demo_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('demo_accounts', 'session_expires_at')) {
                $table->dropColumn('session_expires_at');
            }

            if (Schema::hasColumn('demo_accounts', 'session_token')) {
                $table->dropColumn('session_token');
            }
        });
    }
};