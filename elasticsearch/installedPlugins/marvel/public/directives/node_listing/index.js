define(function (require) {
  var _ = require('lodash');
  var numeral = require('numeral');
  var module = require('ui/modules').get('marvel/directives', []);
  var React = require('react');
  var make = React.DOM;
  var extractIp = require('plugins/marvel/lib/extract_ip');

  var Table = require('plugins/marvel/directives/paginated_table/components/table');

  // change the node to actually display the name
  module.directive('marvelNodesListing', function (kbnUrl) {
    // makes the tds for every <tr> in the table
    function makeTdWithPropKey(scope, dataKey, idx) {
      var value = _.get(this.props, dataKey.key);
      var $content = null;
      // Content for the name column.
      if (dataKey.key === 'nodeName') {
        var title = this.props.node.nodeTypeLabel;
        var classes = 'fa ' + this.props.node.nodeTypeClass;
        var state = this.state || {};
        $content = make.div(null,
          make.span({
            style: { paddingRight: 5 }
          }, make.i({
            title: title,
            className: classes },
            null)
          ),
          make.a({
            onClick: function () {
              // Change the url the "Angular" way!
              scope.$evalAsync(function () {
                kbnUrl.changePath('/nodes/' + state.resolver);
              });
            }
          }, state.node.name),
          make.div({className: 'small'}, extractIp(state.node.transport_address))); //   <div.small>
      }
      // make the content for all of the metric columns
      if (_.isObject(value) && value.metric) {
        var formatNumber = (function (metric) {
          return function (val) {
            if (!metric.format) { return val; }
            return numeral(val).format(metric.format) + metric.units;
          };
        }(value.metric));
        // if the node is no longer online only show N/A
        if (this.props.offline) {
          $content = make.div(null, make.div({className: 'big inline'}, 'N/A'));
        } else {
          var displayVal = formatNumber(value.last);
          // make the big metric value you appear with min,
          // max, and an arrow.
          $content = make.div(null,
            make.div({className: 'big inline'}, displayVal),
            make.i({className: 'inline big fa fa-long-arrow-' + (value.slope > 0 ? 'up' : 'down')}),
            make.div({className: 'inline'},
              make.div({className: 'small'}, formatNumber(value.max) + ' max'),
              make.div({className: 'small'}, formatNumber(value.min) + ' min')));
        }
      }
      // Content for non metric columns
      if (!$content && !_.isUndefined(value)) {
        if (this.props.offline && dataKey.key !== 'status') {
          $content = make.div(null, make.div({className: 'big inline'}, 'N/A'));
        } else {
          const classNames = `big inline ${dataKey.key}-${('' + value).toLowerCase()}`;
          $content = make.div(null, make.div({className: classNames}, value));
        }
      }
      return make.td({key: idx}, $content);
    }

    var initialTableOptions = {
      title: 'Nodes',
      searchPlaceholder: 'Filter Nodes',
      /* "key" should be an object
       *   - unless it's the "name" key
       *   - the key object should have:
       *      - "metric" object
       *      - "last" scalar
       * "sortKey" should be a scalar */
      columns: [
        {
          key: 'nodeName',
          sortKey: 'nodeName',
          sort: 1,
          title: 'Name'
        },
        {
          key: 'metrics.node_cpu_utilization',
          sortKey: 'metrics.node_cpu_utilization.last',
          title: 'CPU Usage'
        },
        {
          key: 'metrics.node_jvm_mem_percent',
          sortKey: 'metrics.node_jvm_mem_percent.last',
          title: 'JVM Memory'
        },
        {
          key: 'metrics.node_load_average',
          sortKey: 'metrics.node_load_average.last',
          title: 'Load Average'
        },
        {
          key: 'metrics.node_free_space',
          sortKey: 'metrics.node_free_space.last',
          title: 'Disk Free Space'
        },
        {
          key: 'metrics.shard_count',
          title: 'Shards'
        },
        {
          key: 'status',
          sortKey: 'offline',
          title: 'Status'
        }
      ]
    };

    return {
      restrict: 'E',
      scope: { cluster: '=', rows: '=' },
      link: function (scope, $el) {

        // copy node fields to top-level so table filtering works
        function decorateRow(row) {
          if (!row) return null;
          row.nodeName = _.get(row, 'node.name');
          row.type = _.get(row, 'node.type');
          row.transport_address = _.get(row, 'node.transport_address');
          row.status = row.offline ? 'Offline' : 'Online';
          return row;
        }

        // component for each table row
        var tableRowTemplate = React.createClass({
          getInitialState: function () {
            var row = _.find(scope.rows, {resolver: this.props.resolver});
            return decorateRow(row);
          },
          componentWillReceiveProps: function (newProps) {
            var row = _.find(scope.rows, {resolver: newProps.resolver});
            this.setState(decorateRow(row));
          },
          render: function () {
            var boundTemplateFn = _.bind(makeTdWithPropKey, this, scope);
            var $tdsArr = initialTableOptions.columns.map(boundTemplateFn);
            return make.tr({
              className: 'big no-border',
              key: `row-${this.props.resolver}`
            }, $tdsArr);
          }
        });

        var $table = React.createElement(Table, {
          options: initialTableOptions,
          template: tableRowTemplate
        });
        var tableInstance = React.render($table, $el[0]);
        scope.$watch('rows', function (rows) {
          tableInstance.setData(rows.map(function (row) {
            return decorateRow(row);
          }));
        });
      }
    };
  });
});
