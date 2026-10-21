/**
 * ========================================================================
 * TEMUIN — HTTP ERROR CODES & UTILITIES
 * ========================================================================
 *
 * Pemetaan standar status HTTP ke teks & pesan Bahasa Indonesia resmi.
 * Menangani respon server, network error, dan timeout secara konsisten
 * tanpa mengarang kode HTTP palsu jika tidak ada respon server.
 */

export const HTTP_STATUS_NAMES: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  408: 'Request Timeout',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

export const HTTP_STATUS_DESCRIPTIONS: Record<number, string> = {
  200: 'Permintaan berhasil diproses.',
  201: 'Data berhasil dibuat.',
  400: 'Data permintaan tidak valid atau belum lengkap.',
  401: 'Sesi login telah berakhir. Silakan login kembali.',
  403: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
  404: 'Data atau endpoint yang dicari tidak ditemukan.',
  408: 'Permintaan melewati batas waktu.',
  409: 'Terjadi konflik data pada server.',
  422: 'Data tidak memenuhi aturan validasi server.',
  429: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
  500: 'Terjadi kesalahan pada server.',
  502: 'Server perantara menerima respons yang tidak valid.',
  503: 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.',
  504: 'Server perantara menunggu terlalu lama.',
};

export interface FormattedErrorDisplay {
  title: string;
  message: string;
  badge: string;
  statusCode?: number;
  canRetry: boolean;
  devDetails?: string;
}

export class AppApiError extends Error {
  public statusCode?: number;
  public statusText?: string;
  public isNetworkError: boolean;
  public isTimeout: boolean;
  public rawBody?: string;
  public serverData?: any;
  public userMessage: string;
  public displayTitle: string;
  public displayBadge: string;
  public canRetry: boolean;

  constructor(params: {
    statusCode?: number;
    statusText?: string;
    message?: string;
    rawBody?: string;
    serverData?: any;
    isNetworkError?: boolean;
    isTimeout?: boolean;
  }) {
    const isNetwork = Boolean(params.isNetworkError);
    const isTime = Boolean(params.isTimeout);
    const code = params.statusCode;

    let title = '';
    let badge = '';
    let friendlyMessage = '';
    let retryable = false;

    if (isTime) {
      title = 'Request Timeout';
      badge = 'Request Timeout';
      friendlyMessage =
        params.message || 'Server tidak memberikan respons tepat waktu.';
      retryable = true;
    } else if (isNetwork || !code) {
      title = 'Koneksi Gagal';
      badge = 'Koneksi Gagal';
      friendlyMessage =
        params.message || 'Server tidak dapat dijangkau.';
      retryable = true;
    } else {
      const statusName =
        params.statusText || HTTP_STATUS_NAMES[code] || `HTTP ${code}`;
      badge = `HTTP ${code}`;
      title = `HTTP ${code} — ${statusName}`;

      // Ambil pesan dari response server jika ada, atau fallback deskripsi resmi
      const serverMsg =
        params.message ||
        (params.serverData &&
          (params.serverData.error ||
            params.serverData.message ||
            params.serverData.detail)) ||
        HTTP_STATUS_DESCRIPTIONS[code] ||
        'Terjadi kesalahan saat memproses permintaan.';

      friendlyMessage = serverMsg;
      retryable = [408, 429, 502, 503, 504].includes(code);
    }

    super(friendlyMessage);
    this.name = 'AppApiError';
    this.statusCode = code;
    this.statusText = params.statusText || (code ? HTTP_STATUS_NAMES[code] : undefined);
    this.isNetworkError = isNetwork;
    this.isTimeout = isTime;
    this.rawBody = params.rawBody;
    this.serverData = params.serverData;
    this.userMessage = friendlyMessage;
    this.displayTitle = title;
    this.displayBadge = badge;
    this.canRetry = retryable;
  }
}

/**
 * Memformat sembarang error menjadi struktur tampilan rapi untuk UI
 */
export function formatApiError(error: unknown): FormattedErrorDisplay {
  if (error instanceof AppApiError) {
    let devDetails: string | undefined = undefined;
    if (__DEV__ && error.rawBody) {
      // Bersihkan kemungkinan token/password sebelum ditampilkan di dev
      const sanitized = error.rawBody
        .replace(/("password"|"token"|"access_token"):\s*"[^"]+"/gi, '$1: "[REDACTED]"')
        .substring(0, 300);
      devDetails = `Raw response: ${sanitized}`;
    }

    return {
      title: error.displayTitle,
      message: error.userMessage,
      badge: error.displayBadge,
      statusCode: error.statusCode,
      canRetry: error.canRetry,
      devDetails,
    };
  }

  if (error instanceof Error) {
    const isTimeout =
      error.name === 'AbortError' ||
      error.message.toLowerCase().includes('timeout');
    const isNetwork =
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('failed to fetch') ||
      error.message.toLowerCase().includes('connection') ||
      error.message.toLowerCase().includes('offline');

    if (isTimeout) {
      return {
        title: 'Request Timeout',
        message: 'Server tidak memberikan respons tepat waktu.',
        badge: 'Request Timeout',
        canRetry: true,
      };
    }

    if (isNetwork) {
      return {
        title: 'Koneksi Gagal',
        message: 'Server tidak dapat dijangkau.',
        badge: 'Koneksi Gagal',
        canRetry: true,
      };
    }

    return {
      title: 'Terjadi Kesalahan',
      message: error.message || 'Terjadi gangguan saat memproses data.',
      badge: 'Error',
      canRetry: false,
    };
  }

  if (typeof error === 'string') {
    return {
      title: 'Perhatian',
      message: error,
      badge: 'Info',
      canRetry: false,
    };
  }

  return {
    title: 'Koneksi Gagal',
    message: 'Server tidak dapat dijangkau.',
    badge: 'Koneksi Gagal',
    canRetry: true,
  };
}
