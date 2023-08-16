import { Subject, Observable, Observer } from 'rxjs'

/**
 * events to handle:
 *
 * null: Event {isTrusted: true, type: "error", target: WebSocket, currentTarget: WebSocket, eventPhase: 0, …}
 */
export class WebSocketService {
  private subject: Subject<MessageEvent>;

  static readonly WS_NOTIFY_TYPE = {OPEN: 'open', CLOSE: 'close'};

  log(message: string): void {
    console.debug('WebSocketService:' + message);
  }

  /**
   * Call this to share a single instance with the Provider scope.  
   * It will lazy instantiate it.  
   * 
   * @param url 
   */
  public connect(url: string): Subject<MessageEvent> {
    this.log('connect: Connecting to WebSocket at ' + url);

    if (!this.subject) {
      this.subject = this.create(url);
    }

    return this.subject;
  }

  /**
   * Call this to create a new instance of Subject.
   * 
   * @param url 
   */
  public create(url: string): Subject<MessageEvent> {
    const ws = new WebSocket(url);

    const observable = Observable.create((obs: Observer<MessageEvent>) => {
      ws.onmessage = obs.next.bind(obs);
      ws.onerror = obs.error.bind(obs);

      // ws.onclose = obs.complete.bind(obs);
      ws.onclose = function(event: Event) {
        const msg = {'wsnotify': WebSocketService.WS_NOTIFY_TYPE.CLOSE};
        const msgEvent = new MessageEvent('wsnotify', {data: JSON.stringify(msg)});
        obs.next(msgEvent);
        obs.complete();
      }

      ws.onopen = function(event: Event) {
        // console.debug('ws.onopen event: ' + JSON.stringify(event));
        // const hearbeat = {"notify":[{"heartbeat":"1569179877972"}]}
        const msg = {'wsnotify': WebSocketService.WS_NOTIFY_TYPE.OPEN};
        const msgEvent = new MessageEvent('wsnotify', {data: JSON.stringify(msg)});
        // console.debug('ws.onopen openEvent: ' + JSON.stringify(openEvent));
        // console.debug('ws.onopen openEvent.data: ' + JSON.stringify(openEvent.data));

        obs.next(msgEvent);
        // ws.onmessage(openEvent);
      };

      return ws.close.bind(ws);
    });

    const observer = {
      next: (data: Object) => {
        if (ws.readyState === 1 /* WebSocket.OPEN */) {
          ws.send(JSON.stringify(data));
        } else if (ws.readyState === 0 /* WebSocket.CONNECTING */) {
          console.warn('ws.readyState still CONNECTING: ' + ws.readyState + ', data: ' + JSON.stringify(data));
        } else if (ws.readyState === 3 /* WebSocket.CLOSED */) {
          console.warn('ws.readyState CLOSED: ' + ws.readyState + ', data: ' + JSON.stringify(data));
        } else if (ws.readyState === 2 /* WebSocket.CLOSING */) {
          console.warn('ws.readyState CLOSING: ' + ws.readyState + ', data: ' + JSON.stringify(data));
        } else {
          console.warn('ws.readyState not WebSocket.OPEN: ' + ws.readyState + ', WebSocket.OPEN: ' +
            WebSocket.OPEN + ', data: ' + JSON.stringify(data));
        }
      },
    };

    return Subject.create(observer, observable);
  }
}
