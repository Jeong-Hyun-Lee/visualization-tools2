import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SldIoMessageService } from './sld-io-message.service';

@Component({
  selector: 'app-sld-io-message',
  templateUrl: './sld-io-message.component.html',
  styleUrls: ['./sld-io-message.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SldIoMessageComponent {
  constructor(readonly io: SldIoMessageService) {}
}
